-- Vector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------- tags ----------
CREATE TYPE public.tag_kind AS ENUM ('category', 'indication', 'symptom', 'population', 'form');

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_es text NOT NULL,
  kind public.tag_kind NOT NULL,
  parent_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tags_kind ON public.tags(kind);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags public read" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags admin write" ON public.tags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------- tag_aliases ----------
CREATE TABLE public.tag_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  alias text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alias)
);
CREATE INDEX idx_tag_aliases_tag ON public.tag_aliases(tag_id);
CREATE INDEX idx_tag_aliases_trgm ON public.tag_aliases USING gin (alias extensions.gin_trgm_ops);
ALTER TABLE public.tag_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag_aliases public read" ON public.tag_aliases FOR SELECT USING (true);
CREATE POLICY "tag_aliases admin write" ON public.tag_aliases FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------- medication_tags ----------
CREATE TABLE public.medication_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'scraper',
  confidence real NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medication_id, tag_id)
);
CREATE INDEX idx_medication_tags_med ON public.medication_tags(medication_id);
CREATE INDEX idx_medication_tags_tag ON public.medication_tags(tag_id);
ALTER TABLE public.medication_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "med_tags public read" ON public.medication_tags FOR SELECT USING (true);
CREATE POLICY "med_tags admin write" ON public.medication_tags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------- embeddings on medications ----------
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS embedding extensions.vector(512);
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_medications_embedding
  ON public.medications USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- ---------- semantic search RPC ----------
CREATE OR REPLACE FUNCTION public.search_medications_semantic(
  q_embedding extensions.vector(512) DEFAULT NULL,
  q_text text DEFAULT NULL,
  p_pharmacy uuid DEFAULT NULL,
  p_tag_slugs text[] DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_active_ingredient text DEFAULT NULL,
  lim int DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  active_ingredient text,
  presentation text,
  category text,
  indication text,
  manufacturer text,
  image_url text,
  brand_names text[],
  brand_names_text text,
  symptoms_text text,
  indication_es text,
  similarity real
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    m.id, m.slug, m.name, m.active_ingredient, m.presentation,
    m.category, m.indication, m.manufacturer, m.image_url,
    m.brand_names, m.brand_names_text, m.symptoms_text, m.indication_es,
    CASE
      WHEN q_embedding IS NOT NULL AND m.embedding IS NOT NULL
        THEN (1 - (m.embedding <=> q_embedding))::real
      WHEN q_text IS NOT NULL AND length(q_text) >= 2
        THEN GREATEST(
          extensions.similarity(m.name, q_text),
          extensions.similarity(m.active_ingredient, q_text),
          extensions.similarity(coalesce(m.brand_names_text,''), q_text),
          extensions.similarity(coalesce(m.symptoms_text,''), q_text),
          extensions.similarity(coalesce(m.indication,''), q_text)
        )::real
      ELSE 0.0::real
    END AS similarity
  FROM public.medications m
  WHERE
    (p_brand IS NULL OR m.brand_names_text ILIKE '%' || p_brand || '%')
    AND (p_active_ingredient IS NULL OR m.active_ingredient ILIKE '%' || p_active_ingredient || '%')
    AND (
      p_tag_slugs IS NULL OR array_length(p_tag_slugs, 1) IS NULL
      OR EXISTS (
        SELECT 1 FROM public.medication_tags mt
        JOIN public.tags t ON t.id = mt.tag_id
        WHERE mt.medication_id = m.id AND t.slug = ANY(p_tag_slugs)
      )
    )
    AND (
      p_pharmacy IS NULL
      OR EXISTS (
        SELECT 1 FROM public.medication_prices mp
        WHERE mp.medication_id = m.id AND mp.pharmacy_id = p_pharmacy
      )
    )
  ORDER BY similarity DESC NULLS LAST, m.name ASC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public.search_medications_semantic(extensions.vector, text, uuid, text[], text, text, int) TO anon, authenticated;

-- ---------- tags helper RPC ----------
CREATE OR REPLACE FUNCTION public.tags_for_medication(p_medication_id uuid)
RETURNS TABLE (slug text, label_es text, kind public.tag_kind, source text, confidence real)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT t.slug, t.label_es, t.kind, mt.source, mt.confidence
  FROM public.medication_tags mt
  JOIN public.tags t ON t.id = mt.tag_id
  WHERE mt.medication_id = p_medication_id
  ORDER BY mt.confidence DESC, t.label_es;
$$;

GRANT EXECUTE ON FUNCTION public.tags_for_medication(uuid) TO anon, authenticated;

-- ---------- seed taxonomy ----------
INSERT INTO public.tags (slug, label_es, kind) VALUES
  ('analgesico', 'Analgésico', 'category'),
  ('antiinflamatorio', 'Antiinflamatorio', 'category'),
  ('antibiotico', 'Antibiótico', 'category'),
  ('antialergico', 'Antialérgico / Antihistamínico', 'category'),
  ('antipiretico', 'Antipirético', 'category'),
  ('antitusivo', 'Antitusivo / Expectorante', 'category'),
  ('antiacido', 'Antiácido / Digestivo', 'category'),
  ('vitamina', 'Vitamina / Suplemento', 'category'),
  ('cardiovascular', 'Cardiovascular', 'category'),
  ('antidiabetico', 'Antidiabético', 'category'),
  ('dermatologico', 'Dermatológico', 'category'),
  ('oftalmologico', 'Oftalmológico', 'category'),
  ('respiratorio', 'Respiratorio', 'category'),
  ('ansiolitico', 'Ansiolítico / Sueño', 'category'),
  ('anticonceptivo', 'Anticonceptivo / Salud sexual', 'category'),
  ('dolor-cabeza', 'Dolor de cabeza', 'symptom'),
  ('fiebre', 'Fiebre', 'symptom'),
  ('gripe', 'Gripe / Resfriado', 'symptom'),
  ('tos', 'Tos', 'symptom'),
  ('dolor-muscular', 'Dolor muscular', 'symptom'),
  ('dolor-menstrual', 'Dolor menstrual', 'symptom'),
  ('acidez', 'Acidez / Reflujo', 'symptom'),
  ('diarrea', 'Diarrea', 'symptom'),
  ('estrenimiento', 'Estreñimiento', 'symptom'),
  ('alergia', 'Alergia', 'symptom'),
  ('insomnio', 'Insomnio', 'symptom'),
  ('ninos', 'Niños / Pediátrico', 'population'),
  ('adultos-mayores', 'Adultos mayores', 'population'),
  ('embarazo', 'Embarazo', 'population'),
  ('tableta', 'Tableta', 'form'),
  ('jarabe', 'Jarabe', 'form'),
  ('crema', 'Crema / Pomada', 'form'),
  ('inyectable', 'Inyectable', 'form'),
  ('gotas', 'Gotas', 'form'),
  ('capsula', 'Cápsula', 'form'),
  ('suspension', 'Suspensión', 'form')
ON CONFLICT (slug) DO NOTHING;

-- ---------- seed common aliases ----------
INSERT INTO public.tag_aliases (tag_id, alias, source)
SELECT t.id, a.alias, 'manual' FROM public.tags t JOIN (VALUES
  ('analgesico', 'analgesico'),
  ('analgesico', 'analgésico'),
  ('analgesico', 'dolor'),
  ('analgesico', 'pain relief'),
  ('antiinflamatorio', 'antiinflamatorio'),
  ('antiinflamatorio', 'aine'),
  ('antiinflamatorio', 'inflamacion'),
  ('antiinflamatorio', 'inflamación'),
  ('antibiotico', 'antibiotico'),
  ('antibiotico', 'antibiótico'),
  ('antibiotico', 'antibiotic'),
  ('antibiotico', 'infeccion bacteriana'),
  ('antialergico', 'antihistaminico'),
  ('antialergico', 'antihistamínico'),
  ('antialergico', 'alergia'),
  ('antipiretico', 'antipiretico'),
  ('antipiretico', 'antipirético'),
  ('antipiretico', 'baja fiebre'),
  ('antitusivo', 'tos'),
  ('antitusivo', 'expectorante'),
  ('antitusivo', 'mucolitico'),
  ('antiacido', 'acidez'),
  ('antiacido', 'reflujo'),
  ('antiacido', 'gastritis'),
  ('antiacido', 'digestivo'),
  ('vitamina', 'vitamina'),
  ('vitamina', 'suplemento'),
  ('vitamina', 'multivitaminico'),
  ('cardiovascular', 'corazon'),
  ('cardiovascular', 'presion arterial'),
  ('cardiovascular', 'hipertension'),
  ('antidiabetico', 'diabetes'),
  ('antidiabetico', 'glucosa'),
  ('dermatologico', 'piel'),
  ('dermatologico', 'crema dermatologica'),
  ('oftalmologico', 'ojos'),
  ('oftalmologico', 'colirio'),
  ('respiratorio', 'asma'),
  ('respiratorio', 'broncodilatador'),
  ('respiratorio', 'inhalador'),
  ('ansiolitico', 'ansiedad'),
  ('ansiolitico', 'sueno'),
  ('ansiolitico', 'sueño'),
  ('anticonceptivo', 'anticonceptivo'),
  ('anticonceptivo', 'planificacion'),
  ('dolor-cabeza', 'dolor de cabeza'),
  ('dolor-cabeza', 'cefalea'),
  ('dolor-cabeza', 'migrana'),
  ('dolor-cabeza', 'migraña'),
  ('dolor-cabeza', 'jaqueca'),
  ('fiebre', 'fiebre'),
  ('fiebre', 'temperatura'),
  ('fiebre', 'calentura'),
  ('gripe', 'gripe'),
  ('gripe', 'resfriado'),
  ('gripe', 'catarro'),
  ('gripe', 'flu'),
  ('tos', 'tos seca'),
  ('tos', 'tos productiva'),
  ('dolor-muscular', 'dolor muscular'),
  ('dolor-muscular', 'mialgia'),
  ('dolor-muscular', 'contractura'),
  ('dolor-menstrual', 'dolor menstrual'),
  ('dolor-menstrual', 'colicos menstruales'),
  ('dolor-menstrual', 'dismenorrea'),
  ('acidez', 'acidez'),
  ('acidez', 'agruras'),
  ('diarrea', 'diarrea'),
  ('estrenimiento', 'estreñimiento'),
  ('estrenimiento', 'constipacion'),
  ('alergia', 'rinitis'),
  ('alergia', 'urticaria'),
  ('insomnio', 'insomnio'),
  ('ninos', 'niños'),
  ('ninos', 'pediatrico'),
  ('ninos', 'infantil'),
  ('adultos-mayores', 'adulto mayor'),
  ('adultos-mayores', 'tercera edad'),
  ('embarazo', 'embarazo'),
  ('embarazo', 'gestacion'),
  ('tableta', 'tableta'),
  ('tableta', 'tabletas'),
  ('tableta', 'comprimido'),
  ('tableta', 'pastilla'),
  ('jarabe', 'jarabe'),
  ('jarabe', 'syrup'),
  ('crema', 'crema'),
  ('crema', 'pomada'),
  ('crema', 'unguento'),
  ('inyectable', 'inyectable'),
  ('inyectable', 'ampolla'),
  ('gotas', 'gotas'),
  ('capsula', 'capsula'),
  ('capsula', 'cápsula'),
  ('capsula', 'capsulas'),
  ('suspension', 'suspension'),
  ('suspension', 'suspensión')
) AS a(tag_slug, alias) ON t.slug = a.tag_slug
ON CONFLICT (alias) DO NOTHING;