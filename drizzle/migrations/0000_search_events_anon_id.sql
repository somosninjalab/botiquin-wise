ALTER TABLE public.search_events ADD COLUMN IF NOT EXISTS anon_id text;
CREATE INDEX IF NOT EXISTS search_events_anon_id_idx ON public.search_events (anon_id);