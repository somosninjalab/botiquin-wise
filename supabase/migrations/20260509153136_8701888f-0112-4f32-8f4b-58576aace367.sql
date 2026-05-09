DELETE FROM public.pharmacy_search_config
WHERE pharmacy_id IN (SELECT id FROM public.pharmacies WHERE slug IN ('farmatodo','gopharma'));