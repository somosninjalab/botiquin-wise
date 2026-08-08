CREATE OR REPLACE FUNCTION public.migrate_anon_conversation(p_anon_token text, p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected INTEGER;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_anon_token IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.chat_conversations
     SET user_id = v_user_id,
         anon_token = NULL,
         ended_in_signup = true
   WHERE anon_token = p_anon_token
     AND user_id IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.health_signals hs
     SET user_id = v_user_id
   WHERE hs.user_id IS NULL
     AND hs.conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = v_user_id);
  RETURN affected;
END;
$function$;