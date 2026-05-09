CREATE TABLE public.pharmacy_search_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL UNIQUE,
  search_url_template text NOT NULL,
  result_link_selector text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_search_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search config public read"
ON public.pharmacy_search_config FOR SELECT
USING (true);

CREATE POLICY "search config admin write"
ON public.pharmacy_search_config FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_pharmacy_search_config_updated_at
BEFORE UPDATE ON public.pharmacy_search_config
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();