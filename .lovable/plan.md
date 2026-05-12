# Estandarización de búsqueda y taxonomía

## Objetivo

Que cualquier medicamento, sin importar de qué farmacia se haya scrapeado, quede con la misma forma normalizada (campos + etiquetas) y sea encontrable por búsqueda semántica que respete los filtros actuales (farmacia, categoría, indicación, marca, principio activo).

## Arquitectura

```text
┌─ scrape-prices ─┐  ┌─ discover-meds ─┐  ┌─ enrich-meds ─┐
└────────┬────────┘  └────────┬────────┘  └───────┬───────┘
         └────────────┬───────┴───────────────────┘
                      ▼
         lib/medications/normalize.ts   ← normaliza nombre, ai, presentación
         lib/medications/tagger.ts      ← mapea texto libre → taxonomía
                      ▼
              upsert medications
                      ▼
         lib/medications/embed.ts       ← Lovable AI embedding (gemini)
                      ▼
              UPDATE medications.embedding
                      ▼
   RPC search_medications_semantic(q, filtros)  ← usado por buscar.tsx + index.tsx
```

## Cambios DB (migración)

1. `CREATE EXTENSION vector;`
2. `tags` — taxonomía controlada
   - `id`, `slug` (unique), `label_es`, `kind` (`category` | `indication` | `symptom` | `population`), `parent_id` (jerarquía opcional)
3. `tag_aliases` — sinónimos que mapean texto libre → tag
   - `tag_id`, `alias` (lowercased, unique global)
4. `medication_tags` — pivote N:N
   - `medication_id`, `tag_id`, `source` (`scraper` | `llm` | `manual`), `confidence`
5. `medications.embedding vector(768)` + índice IVF/HNSW
6. RPC `public.search_medications_semantic(q_embedding vector, q_text text, p_pharmacy uuid, p_tag_slugs text[], p_brand text, p_active_ingredient text, lim int)` — combina similitud coseno + filtros + fallback trigram para queries cortas
7. RLS: lectura pública en `tags`, `tag_aliases`, `medication_tags`; escritura solo admin/service role

## Pipeline de tagging (server)

`src/lib/medications/normalize.ts`
- `normalizeName`, `normalizeActiveIngredient`, `normalizePresentation`, `extractDosage` — reglas determinísticas (lower, trim, sin acentos, regex de mg/ml)

`src/lib/medications/tagger.ts`
- `mapToTags(rawText[]): { tagSlug, confidence, source }[]`
- 1) Lookup directo en `tag_aliases` (rápido, determinístico)
- 2) Si quedan tokens sin mapear, llama a Lovable AI Gateway (`google/gemini-2.5-flash-lite`) con la lista de tags existentes y pide clasificación; los nuevos aliases se insertan en `tag_aliases` (`source='llm'`) para no llamar al LLM otra vez
- Logs de cobertura (cuántos tokens mapearon vs. quedaron libres)

`src/lib/medications/embed.ts`
- `embedText(text): Promise<number[]>` usando Lovable AI (`google/text-embedding-004`)
- Texto a embeber = `name + active_ingredient + brand_names + indication_es + tags(label_es).join(' ')`

## Integración en scrapers

Cada hook que hoy hace `upsert` en `medications` (`scrape-prices`, `discover-meds`, `discover-on-demand`, `enrich-meds`, `seed-cima`) pasa por:
```
const norm = normalize(rawMed);
const { id } = await upsertMedication(norm);
await syncTags(id, [norm.category, norm.indication, ...norm.symptoms]);
await refreshEmbedding(id);
```
Se extrae a `src/lib/medications/upsert.server.ts` para no duplicar lógica entre scrapers.

## Backfill

Hook nuevo: `src/routes/api/public/hooks/backfill-tags-embeddings.ts`
- Procesa por lotes (50 meds) con cursor por `created_at`
- Para cada med: re-tagging + re-embedding
- Idempotente; safe re-runs
- Programado en `pg_cron` cada noche para meds nuevos

## Búsqueda

`src/lib/medications.ts`
- `searchMedications(query, filters)` ahora:
  1. Genera embedding del query (vía server fn `embed-query.functions.ts`, cacheado en memoria por sesión)
  2. Llama `search_medications_semantic` con embedding + filtros existentes (farmacia, marca, ai, categoría → tag_slug)
  3. Si la query es vacía o < 3 chars, salta el embedding y usa solo filtros
  4. Mantiene `suggest_medications` para autocomplete (no cambia)

`src/routes/index.tsx` y `src/routes/buscar.tsx`
- Mantienen su UI; solo cambia el shape del filtro `cat`/`ind` a `tag_slug` (con mapping retro-compatible)

## Detalles técnicos

- Embeddings: Lovable AI `google/text-embedding-004` (768 dims). Si falta el modelo, fallback a `gemini-2.5-flash-lite` con prompt de embedding pseudo-determinístico — pero validamos primero que esté disponible.
- Coste: cada med ~1 embedding al guardarse + 1 por query. Cache en `medications.embedding` evita recomputar.
- Filtros existentes preservados: `pharm`, `med`, `cat`, `ind`, `brand`, `ai` siguen funcionando; internamente `cat`/`ind` resuelven a `tag_slugs[]`.
- El RPC usa `<#>` (cosine distance) y aplica `WHERE` con tags antes del orden por similitud para mantener velocidad.
- Migración crea índice `ivfflat (embedding vector_cosine_ops) WITH (lists=100)`.

## Orden de ejecución

1. Migración DB (tags, tag_aliases, medication_tags, vector, RPC, RLS)
2. `lib/medications/{normalize,tagger,embed,upsert}.ts`
3. Refactor de los 5 hooks de scraping para usar `upsertMedication`
4. Hook `backfill-tags-embeddings` + cron nocturno
5. Cambiar `searchMedications` a `search_medications_semantic`
6. Smoke test: invocar backfill con `limit=20`, comprobar que `medications.embedding` se llena y que `/buscar?q=dolor de cabeza` devuelve paracetamol/ibuprofeno aunque no contengan literalmente esas palabras

## Fuera de alcance

- UI nueva para administrar tags (puede ir después; por ahora se gestionan vía SQL/aliases auto-aprendidos)
- Re-scrape masivo de farmacias (solo re-tagging/embedding sobre lo ya almacenado)
