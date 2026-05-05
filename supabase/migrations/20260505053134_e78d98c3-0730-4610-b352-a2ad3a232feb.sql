
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS symptoms_text text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_meds_symptoms_trgm
  ON public.medications USING gin (symptoms_text extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_meds_category_trgm
  ON public.medications USING gin (category extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_meds_indication_trgm
  ON public.medications USING gin (indication extensions.gin_trgm_ops);

-- Recrea la función fuzzy para incluir síntomas, categoría e indicación
CREATE OR REPLACE FUNCTION public.search_medications_fuzzy(q text, lim integer DEFAULT 30)
RETURNS SETOF medications
LANGUAGE sql STABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT m.*
  FROM public.medications m
  WHERE q IS NOT NULL AND length(q) >= 3
    AND (
      extensions.similarity(m.name, q) > 0.25
      OR extensions.similarity(m.active_ingredient, q) > 0.25
      OR extensions.similarity(m.brand_names_text, q) > 0.25
      OR extensions.similarity(coalesce(m.symptoms_text,''), q) > 0.2
      OR extensions.similarity(coalesce(m.indication,''), q) > 0.25
      OR extensions.similarity(coalesce(m.category,''), q) > 0.25
    )
  ORDER BY GREATEST(
    extensions.similarity(m.name, q),
    extensions.similarity(m.active_ingredient, q),
    extensions.similarity(m.brand_names_text, q),
    extensions.similarity(coalesce(m.symptoms_text,''), q),
    extensions.similarity(coalesce(m.indication,''), q),
    extensions.similarity(coalesce(m.category,''), q)
  ) DESC
  LIMIT lim;
$$;
