
REVOKE EXECUTE ON FUNCTION public.migrate_anon_conversation(TEXT, UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.migrate_anon_conversation(TEXT, UUID) TO authenticated;
