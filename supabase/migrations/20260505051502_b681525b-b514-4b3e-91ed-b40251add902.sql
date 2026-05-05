-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes for faster fuzzy search
CREATE INDEX IF NOT EXISTS idx_meds_name_trgm ON public.medications USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_meds_ai_trgm ON public.medications USING gin (active_ingredient gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_meds_brands_trgm ON public.medications USING gin (brand_names_text gin_trgm_ops);

-- Add commonly searched medications missing from catalog
INSERT INTO public.medications (slug, name, active_ingredient, presentation, category, indication, manufacturer, brand_names) VALUES
  ('sildenafil-50mg', 'Sildenafil 50 mg', 'Sildenafil', 'Tableta 50 mg', 'Disfunción eréctil', 'Tratamiento de la disfunción eréctil', 'Genérico', ARRAY['Viagra','Magnus','Vorst','Erectalis','Silagra']),
  ('tadalafilo-20mg', 'Tadalafilo 20 mg', 'Tadalafilo', 'Tableta 20 mg', 'Disfunción eréctil', 'Tratamiento de la disfunción eréctil', 'Genérico', ARRAY['Cialis','Tadacip']),
  ('naproxeno-550mg', 'Naproxeno 550 mg', 'Naproxeno sódico', 'Tableta 550 mg', 'Analgésico', 'Dolor e inflamación', 'Genérico', ARRAY['Aleve','Apronax','Flanax','Naprosyn']),
  ('ranitidina-150mg', 'Ranitidina 150 mg', 'Ranitidina', 'Tableta 150 mg', 'Gastrointestinal', 'Acidez y reflujo', 'Genérico', ARRAY['Zantac','Ranisen']),
  ('dexametasona-4mg', 'Dexametasona 4 mg', 'Dexametasona', 'Tableta 4 mg', 'Corticoide', 'Inflamación y alergias', 'Genérico', ARRAY['Decadron','Decortin']),
  ('ciprofloxacino-500mg', 'Ciprofloxacino 500 mg', 'Ciprofloxacino', 'Tableta 500 mg', 'Antibiótico', 'Infecciones bacterianas', 'Genérico', ARRAY['Cipro','Ciproxina','Ciprobay']),
  ('metoclopramida-10mg', 'Metoclopramida 10 mg', 'Metoclopramida', 'Tableta 10 mg', 'Gastrointestinal', 'Náuseas y vómitos', 'Genérico', ARRAY['Plasil','Reglan','Primperan'])
ON CONFLICT (slug) DO NOTHING;