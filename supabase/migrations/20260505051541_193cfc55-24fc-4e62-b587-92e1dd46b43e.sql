CREATE OR REPLACE FUNCTION public.search_medications_fuzzy(q text, lim int DEFAULT 30)
RETURNS SETOF public.medications
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT m.*
  FROM public.medications m
  WHERE q IS NOT NULL AND length(q) >= 3
    AND (
      extensions.similarity(m.name, q) > 0.25
      OR extensions.similarity(m.active_ingredient, q) > 0.25
      OR extensions.similarity(m.brand_names_text, q) > 0.25
    )
  ORDER BY GREATEST(
    extensions.similarity(m.name, q),
    extensions.similarity(m.active_ingredient, q),
    extensions.similarity(m.brand_names_text, q)
  ) DESC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public.search_medications_fuzzy(text, int) TO anon, authenticated;