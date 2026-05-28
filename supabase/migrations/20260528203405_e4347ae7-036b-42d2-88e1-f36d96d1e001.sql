INSERT INTO storage.buckets (id, name, public)
VALUES ('insights-exports', 'insights-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "insights exports admin read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'insights-exports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "insights exports service write"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'insights-exports' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'insights-exports' AND auth.role() = 'service_role');