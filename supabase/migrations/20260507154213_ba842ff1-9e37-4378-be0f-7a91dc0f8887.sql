
CREATE TABLE public.medication_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX medication_aliases_alias_med_uidx
  ON public.medication_aliases (lower(alias), medication_id);

CREATE INDEX medication_aliases_med_idx
  ON public.medication_aliases (medication_id);

CREATE INDEX medication_aliases_alias_trgm_idx
  ON public.medication_aliases USING gin (alias extensions.gin_trgm_ops);

ALTER TABLE public.medication_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aliases public read"
  ON public.medication_aliases FOR SELECT
  TO public USING (true);

CREATE POLICY "aliases admin write"
  ON public.medication_aliases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Búsqueda fuzzy ampliada que también considera aliases
CREATE OR REPLACE FUNCTION public.search_medications_fuzzy(q text, lim integer DEFAULT 30)
 RETURNS SETOF public.medications
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH alias_hits AS (
    SELECT a.medication_id,
           MAX(extensions.similarity(a.alias, q)) AS sim
    FROM public.medication_aliases a
    WHERE q IS NOT NULL AND length(q) >= 3
      AND extensions.similarity(a.alias, q) > 0.25
    GROUP BY a.medication_id
  )
  SELECT m.*
  FROM public.medications m
  LEFT JOIN alias_hits ah ON ah.medication_id = m.id
  WHERE q IS NOT NULL AND length(q) >= 3
    AND (
      ah.sim IS NOT NULL
      OR extensions.similarity(m.name, q) > 0.25
      OR extensions.similarity(m.active_ingredient, q) > 0.25
      OR extensions.similarity(m.brand_names_text, q) > 0.25
      OR extensions.similarity(coalesce(m.symptoms_text,''), q) > 0.2
      OR extensions.similarity(coalesce(m.indication,''), q) > 0.25
      OR extensions.similarity(coalesce(m.category,''), q) > 0.25
    )
  ORDER BY GREATEST(
    COALESCE(ah.sim, 0),
    extensions.similarity(m.name, q),
    extensions.similarity(m.active_ingredient, q),
    extensions.similarity(m.brand_names_text, q),
    extensions.similarity(coalesce(m.symptoms_text,''), q),
    extensions.similarity(coalesce(m.indication,''), q),
    extensions.similarity(coalesce(m.category,''), q)
  ) DESC
  LIMIT lim;
$function$;
