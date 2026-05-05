DELETE FROM public.medication_prices mp
USING public.pharmacies p
WHERE mp.pharmacy_id = p.id
  AND mp.product_url IS NOT NULL
  AND (
    trim(trailing '/' from lower(mp.product_url)) = trim(trailing '/' from lower(p.website_url))
    OR lower(mp.product_url) LIKE '%locatelcolombia.com%'
  );