CREATE TABLE public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  source text,
  url text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT share_events_channel_len CHECK (length(channel) BETWEEN 1 AND 40),
  CONSTRAINT share_events_source_len CHECK (source IS NULL OR length(source) <= 100),
  CONSTRAINT share_events_url_len CHECK (url IS NULL OR length(url) <= 500)
);

GRANT INSERT ON public.share_events TO anon, authenticated;
GRANT SELECT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share insert anyone"
  ON public.share_events FOR INSERT
  TO anon, authenticated
  WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

CREATE POLICY "share admin read"
  ON public.share_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX share_events_created_at_idx ON public.share_events (created_at DESC);
CREATE INDEX share_events_channel_idx ON public.share_events (channel);