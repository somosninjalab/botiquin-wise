ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS brand_names_text text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.medications_sync_brand_text()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.brand_names_text := COALESCE(array_to_string(NEW.brand_names, ' '), '');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_medications_sync_brand_text ON public.medications;
CREATE TRIGGER trg_medications_sync_brand_text
BEFORE INSERT OR UPDATE OF brand_names ON public.medications
FOR EACH ROW EXECUTE FUNCTION public.medications_sync_brand_text();

UPDATE public.medications SET brand_names = brand_names;