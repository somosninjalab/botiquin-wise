## Cambio de estrategia de scraping: usar el buscador interno de cada farmacia

Hoy descubrimos URLs de productos con Firecrawl `search` (`site:host query`) + `map`, lo que depende de Google y del sitemap. Pasaremos a usar el **buscador interno de cada sitio** (la URL de búsqueda real que usa el cliente al escribir en su buscador), recorrer los resultados y entrar al primero que coincida con el medicamento. Esto da precios reales, actualizados y refleja exactamente lo que vería un usuario.

### Cómo funcionará la nueva estrategia

Para cada farmacia + medicamento:

1. **Construir la URL del buscador propio** de la farmacia con el término (principio activo o marca + dosis).
2. **Cargar la página de resultados** con Firecrawl (`scrape`) o fetch + Cheerio si el HTML es estático.
3. **Extraer los enlaces de productos** de los resultados (los primeros 3–5).
4. **Filtrar candidatos**: el título debe mencionar el principio activo o una marca conocida y, si el medicamento trae dosis, debe coincidir.
5. **Entrar a cada candidato** y extraer precio, stock, imagen y URL canónica con el mismo `extractionPrompt` actual.
6. **Validar y guardar** en `medication_prices` (igual que hoy: rango por moneda, host autoritativo para currency, append-only para histórico).

### Mapa de buscadores por farmacia

| Slug       | URL de búsqueda                                                                   |
|------------|-----------------------------------------------------------------------------------|
| farmatodo  | `https://www.farmatodo.com.ve/buscar?text={q}`                                    |
| saas       | `https://www.farmaciasaas.com/buscar?text={q}` (verificar selector)               |
| locatel    | `https://www.locatel.com.ve/buscar?text={q}`                                      |
| maraplus   | `https://maraplus.com/?s={q}` (WooCommerce)                                       |
| farmago    | `https://farmago.com.ve/?s={q}` (WooCommerce)                                     |
| gopharma   | `https://ec.gopharma.com.ve/buscar?text={q}` (VTEX)                               |
| cinecitta  | `https://store.supermarketcinecitta.com/buscar?text={q}` (VTEX)                   |
| actual     | `https://www.tufarmaciaactual.com/?s={q}` (WooCommerce)                           |

Estas URLs se almacenarán en una tabla nueva `pharmacy_search_config` (slug, search_url_template, result_link_selector opcional) para poder ajustarlas sin redeploy.

### Cambios concretos

**Archivos**
- `src/routes/api/public/hooks/scrape-prices.ts`: reemplazar `searchCandidates` + `mapCandidates` por una nueva función `searchOnPharmacySite(fc, pharm, query)` que:
  - Carga la URL de búsqueda interna.
  - Devuelve los enlaces de producto del listado (extracción con Cheerio buscando `a[href]` cuyo path encaje con `isSpecificProductUrl`).
  - Mantiene `scrapeUrl` y el fallback gratuito sin cambios.
- Nueva tabla `pharmacy_search_config` (1 fila por farmacia) con los templates anteriores.
- `scrape-prices.ts` carga el config al iniciar y usa `replace("{q}", encodeURIComponent(query))`.

**Lógica de candidatos**
- Por variante (`buildQueryVariants`): pedir 1 búsqueda interna, sacar máximo 5 enlaces.
- Filtrar por `isSpecificProductUrl` y por `pageMatchesMed` (texto del listado o luego del producto).
- Cortar tan pronto encontremos un precio válido.

**Histórico, alertas, scheduling**: sin cambios. Seguimos insertando en `medication_prices` y el cron `process-price-alerts` sigue igual.

### Lo que NO cambia

- `extractionPrompt`, parsers de precio/moneda, validación por rango, `pageMatchesMed`.
- Tablas `medications`, `medication_prices`, `price_alerts`, `pharmacies`.
- Cron jobs ni el panel `/admin/precios`.

### Riesgos y mitigación

- Algunos buscadores (Farmatodo, VTEX) **renderizan resultados con JavaScript**. Para esos casos Firecrawl `scrape` (que ejecuta JS) funciona; el fallback `fetchHtml` puede no devolver enlaces. Si el listado viene vacío, caemos al método actual (`search` global / `map`) como red de seguridad.
- WooCommerce (`?s=`) devuelve HTML estático: 100% cubierto por `fetchHtml` + Cheerio.
- Si una farmacia cambia el path de búsqueda, basta con actualizar `pharmacy_search_config` (sin redeploy).

### Entregable

1. Migración: crear `pharmacy_search_config` + insert con los templates.
2. Refactor de `scrape-prices.ts` con la nueva función `searchOnPharmacySite` y fallback al método actual.
3. Probar `/api/public/hooks/scrape-prices` contra 3 medicamentos representativos (paracetamol 500mg, ibuprofeno 400mg, atorvastatina 20mg) y verificar filas nuevas en `medication_prices`.