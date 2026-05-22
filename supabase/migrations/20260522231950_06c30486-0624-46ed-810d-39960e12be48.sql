CREATE TABLE public.email_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_idempotency_created_at ON public.email_idempotency_keys (created_at DESC);

ALTER TABLE public.email_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage idempotency keys"
ON public.email_idempotency_keys
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');