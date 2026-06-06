DROP POLICY IF EXISTS "conv owner update" ON public.chat_conversations;
CREATE POLICY "conv owner update"
  ON public.chat_conversations
  FOR UPDATE
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "conv insert anyone" ON public.chat_conversations;
CREATE POLICY "conv owner insert"
  ON public.chat_conversations
  FOR INSERT
  WITH CHECK (
    user_id IS NOT NULL AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "msg insert via conv" ON public.chat_messages;
CREATE POLICY "msg insert via conv"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id IS NOT NULL
        AND c.user_id = auth.uid()
    )
  );