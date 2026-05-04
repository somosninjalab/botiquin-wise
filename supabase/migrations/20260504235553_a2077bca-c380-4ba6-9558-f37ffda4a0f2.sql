
-- has_role must be callable by authenticated for RLS policies to evaluate
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Replace permissive search insert policy with a tighter one
DROP POLICY "search insert anon" ON public.search_events;
CREATE POLICY "search insert anyone" ON public.search_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (query IS NULL OR length(query) <= 200)
  );
