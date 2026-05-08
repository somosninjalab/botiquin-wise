
CREATE TABLE public.user_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Mi orden',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders own select" ON public.user_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "orders own insert" ON public.user_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders own update" ON public.user_orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders own delete" ON public.user_orders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER user_orders_touch
  BEFORE UPDATE ON public.user_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX user_orders_user_idx ON public.user_orders(user_id, updated_at DESC);
