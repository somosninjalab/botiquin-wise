UPDATE public.medications
SET brand_names = (SELECT ARRAY(SELECT DISTINCT unnest(brand_names || ARRAY['Clorace'])))
WHERE slug IN ('cetirizina-10', 'cetirizina-10-mg-tabletas');

INSERT INTO public.medication_aliases (medication_id, alias)
SELECT id, 'Clorace' FROM public.medications WHERE slug IN ('cetirizina-10','cetirizina-10-mg-tabletas')
ON CONFLICT DO NOTHING;