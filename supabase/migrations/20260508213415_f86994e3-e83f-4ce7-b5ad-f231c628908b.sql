CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL,
  pharmacy_id uuid NOT NULL,
  previous_price numeric NOT NULL,
  new_price numeric NOT NULL,
  pct_change numeric NOT NULL,
  currency text NOT NULL DEFAULT 'VES',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX price_alerts_created_at_idx ON public.price_alerts (created_at DESC);
CREATE INDEX price_alerts_med_pharm_idx ON public.price_alerts (medication_id, pharmacy_id, created_at DESC);
CREATE UNIQUE INDEX price_alerts_dedup_idx ON public.price_alerts
  (medication_id, pharmacy_id, new_price, previous_price);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts public read" ON public.price_alerts FOR SELECT USING (true);
CREATE POLICY "alerts admin write" ON public.price_alerts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));