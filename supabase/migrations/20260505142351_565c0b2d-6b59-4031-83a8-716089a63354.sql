-- Limpieza de precios espurios detectados (URL no corresponde al medicamento)
DELETE FROM public.medication_prices mp
USING public.medications m
WHERE mp.medication_id = m.id
  AND (
    -- Aspirina cuya URL trae "amoxicilina" o "atamel"
    (m.slug = 'aspirina-100mg' AND (mp.product_url ILIKE '%amoxicilina%' OR mp.product_url ILIKE '%atamel%'))
    -- Atorvastatina con URL de Colmibe (otra droga)
    OR (m.slug = 'atorvastatina-20mg' AND mp.product_url ILIKE '%colmibe%')
    -- Amoxicilina cuya URL trae "atamel" o "azitromicina"
    OR (m.slug = 'amoxicilina-500mg' AND (mp.product_url ILIKE '%atamel%' OR mp.product_url ILIKE '%azitromicina%'))
  );

-- Eliminar precios obviamente fuera de rango en VES o desde landers
DELETE FROM public.medication_prices
WHERE (currency = 'VES' AND price < 30)
   OR product_url ILIKE '%/lander%'
   OR product_url ~* '\?(.+&)?(page|order|max_price|min_price|category)=';