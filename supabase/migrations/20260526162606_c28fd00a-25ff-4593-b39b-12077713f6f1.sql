
-- Restrict storage object writes to service_role only.
-- Public read on email-assets bucket continues to work via the bucket's public flag.

CREATE POLICY "Service role can insert storage objects"
ON storage.objects FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update storage objects"
ON storage.objects FOR UPDATE TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete storage objects"
ON storage.objects FOR DELETE TO public
USING (auth.role() = 'service_role');

CREATE POLICY "Public can read email-assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'email-assets');
