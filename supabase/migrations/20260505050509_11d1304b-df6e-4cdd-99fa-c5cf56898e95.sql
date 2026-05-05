ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS brand_names text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_medications_brand_names ON public.medications USING GIN (brand_names);