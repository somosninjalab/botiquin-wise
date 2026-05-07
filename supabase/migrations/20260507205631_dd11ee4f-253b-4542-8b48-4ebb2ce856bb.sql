-- 1) Aliases comerciales venezolanos para medicamentos del catálogo
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ['acetaminofen', 'Atamel'],
    ['acetaminofen', 'Tachipirin'],
    ['acetaminofen', 'Tylenol'],
    ['acetaminofen', 'Panadol'],
    ['acetaminofen', 'Apiretal'],
    ['acetaminofen', 'Mejoral'],
    ['ibuprofeno', 'Advil'],
    ['ibuprofeno', 'Motrin'],
    ['ibuprofeno', 'Dolofen'],
    ['ibuprofeno', 'Ibupirac'],
    ['ibuprofeno', 'Buprex'],
    ['ibuprofeno', 'Brufen'],
    ['loratadina-10', 'Clarityne'],
    ['loratadina-10', 'Claritin'],
    ['loratadina-10', 'Lertamine'],
    ['cetirizina-10', 'Zyrtec'],
    ['cetirizina-10', 'Reactine'],
    ['cetirizina-10', 'Alercet'],
    ['metformina-850', 'Glucophage'],
    ['metformina-850', 'Glafornil'],
    ['metformina-850', 'Dimefor'],
    ['omeprazol-20', 'Losec'],
    ['omeprazol-20', 'Prilosec'],
    ['omeprazol-20', 'Ulcozol'],
    ['esomeprazol-40-mg-tabletas', 'Nexium'],
    ['diclofenaco-50-mg-tabletas', 'Voltaren'],
    ['diclofenaco-potasico-50-mg-tabletas', 'Cataflam'],
    ['amoxicilina-500', 'Amoxil'],
    ['amoxicilina-500', 'Trimox'],
    ['amoxicilina-500', 'Hiconcil'],
    ['azitromicina-500', 'Zithromax'],
    ['azitromicina-500', 'Azitrox'],
    ['azitromicina-500', 'Azimax'],
    ['aspirina-500-mg-tabletas', 'Aspirin'],
    ['aspirina-500-mg-tabletas', 'Bayer'],
    ['aspirina-100-mg-tabletas', 'Cardioaspirina'],
    ['aspirina-100-mg-tabletas', 'Ecotrin'],
    ['enalapril-20', 'Renitec'],
    ['enalapril-20', 'Lotrial'],
    ['enalapril-20', 'Vasotec']
  ];
  i int;
  med_slug text;
  alias_text text;
  med_id uuid;
BEGIN
  FOR i IN 1..array_length(pairs, 1) LOOP
    med_slug := pairs[i][1];
    alias_text := pairs[i][2];
    SELECT id INTO med_id FROM public.medications WHERE slug = med_slug LIMIT 1;
    IF med_id IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.medication_aliases
      WHERE medication_id = med_id AND lower(alias) = lower(alias_text)
    ) THEN
      INSERT INTO public.medication_aliases (medication_id, alias) VALUES (med_id, alias_text);
    END IF;
  END LOOP;
END $$;

-- 2) Tracking de resultados en search_events
ALTER TABLE public.search_events
  ADD COLUMN IF NOT EXISTS result_count integer;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='search_events' AND policyname='search update result count'
  ) THEN
    EXECUTE 'CREATE POLICY "search update result count" ON public.search_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
  END IF;
END $pol$;

-- 3) RPC de sugerencias
CREATE OR REPLACE FUNCTION public.suggest_medications(q text, lim int DEFAULT 6)
RETURNS TABLE(id uuid, name text, slug text, active_ingredient text, similarity real)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
  WITH alias_hits AS (
    SELECT a.medication_id,
           MAX(extensions.similarity(a.alias, q)) AS sim
    FROM public.medication_aliases a
    WHERE q IS NOT NULL AND length(q) >= 2
      AND extensions.similarity(a.alias, q) > 0.15
    GROUP BY a.medication_id
  ),
  scored AS (
    SELECT m.id, m.name, m.slug, m.active_ingredient,
           GREATEST(
             COALESCE(ah.sim, 0),
             extensions.similarity(m.name, q),
             extensions.similarity(m.active_ingredient, q),
             extensions.similarity(m.brand_names_text, q)
           )::real AS similarity
    FROM public.medications m
    LEFT JOIN alias_hits ah ON ah.medication_id = m.id
    WHERE q IS NOT NULL AND length(q) >= 2
  )
  SELECT DISTINCT ON (active_ingredient) id, name, slug, active_ingredient, similarity
  FROM scored
  WHERE similarity > 0.15
  ORDER BY active_ingredient, similarity DESC
  LIMIT lim;
$$;