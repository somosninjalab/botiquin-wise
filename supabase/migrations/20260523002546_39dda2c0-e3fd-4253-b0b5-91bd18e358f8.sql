
CREATE TYPE public.partner_lead_type AS ENUM ('farmacia', 'drogueria');

CREATE TABLE public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.partner_lead_type NOT NULL,
  name text NOT NULL,
  city text,
  reference text,
  has_digital boolean,
  whatsapp text,
  wants_boost boolean,
  details text,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_leads public insert"
  ON public.partner_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND (city IS NULL OR length(city) <= 200)
    AND (reference IS NULL OR length(reference) <= 500)
    AND (whatsapp IS NULL OR length(whatsapp) <= 40)
    AND (details IS NULL OR length(details) <= 2000)
  );

CREATE POLICY "partner_leads admin read"
  ON public.partner_leads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "partner_leads admin update"
  ON public.partner_leads FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
