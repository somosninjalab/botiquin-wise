
-- Chat conversations
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  anon_token TEXT,
  entry_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  city TEXT,
  region TEXT,
  country TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  ended_in_signup BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_conv_owner_chk CHECK (user_id IS NOT NULL OR anon_token IS NOT NULL)
);
CREATE INDEX idx_chat_conv_user ON public.chat_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_chat_conv_anon ON public.chat_conversations(anon_token) WHERE anon_token IS NOT NULL;
CREATE INDEX idx_chat_conv_activity ON public.chat_conversations(last_activity_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO anon;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv owner select" ON public.chat_conversations
  FOR SELECT TO anon, authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "conv insert anyone" ON public.chat_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "conv owner update" ON public.chat_conversations
  FOR UPDATE TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id IS NULL OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_msg_conv ON public.chat_messages(conversation_id, created_at);

GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO anon;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg select via conv" ON public.chat_messages
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND ((c.user_id IS NOT NULL AND c.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );
CREATE POLICY "msg insert via conv" ON public.chat_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.user_id IS NULL OR c.user_id = auth.uid())
    )
  );

-- User health profile (PII sensitive)
CREATE TABLE public.user_health_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age_range TEXT,
  sex TEXT,
  chronic_conditions TEXT[] NOT NULL DEFAULT '{}',
  current_medications TEXT[] NOT NULL DEFAULT '{}',
  other_meds_text TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_uhp_user ON public.user_health_profile(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_health_profile TO authenticated;
GRANT ALL ON public.user_health_profile TO service_role;
ALTER TABLE public.user_health_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uhp owner select" ON public.user_health_profile
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "uhp owner insert" ON public.user_health_profile
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "uhp owner update" ON public.user_health_profile
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "uhp owner delete" ON public.user_health_profile
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER uhp_touch BEFORE UPDATE ON public.user_health_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Health signals (analytics pivot)
CREATE TYPE public.health_signal_type AS ENUM (
  'symptom','condition','medication_mentioned','medication_unknown',
  'price_concern','pharmacy_preference','location','demographic'
);

CREATE TABLE public.health_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  user_id UUID,
  signal_type public.health_signal_type NOT NULL,
  value TEXT NOT NULL,
  normalized_value TEXT,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  city TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hs_type_created ON public.health_signals(signal_type, created_at DESC);
CREATE INDEX idx_hs_conv ON public.health_signals(conversation_id);
CREATE INDEX idx_hs_med ON public.health_signals(medication_id) WHERE medication_id IS NOT NULL;
CREATE INDEX idx_hs_region ON public.health_signals(region);

GRANT SELECT ON public.health_signals TO authenticated;
GRANT ALL ON public.health_signals TO service_role;
ALTER TABLE public.health_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hs admin read" ON public.health_signals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Migration RPC: move anon thread to user on signup
CREATE OR REPLACE FUNCTION public.migrate_anon_conversation(p_anon_token TEXT, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  IF p_anon_token IS NULL OR p_user_id IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.chat_conversations
     SET user_id = p_user_id,
         anon_token = NULL,
         ended_in_signup = true
   WHERE anon_token = p_anon_token
     AND user_id IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.health_signals hs
     SET user_id = p_user_id
   WHERE hs.user_id IS NULL
     AND hs.conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = p_user_id);
  RETURN affected;
END;
$$;
GRANT EXECUTE ON FUNCTION public.migrate_anon_conversation(TEXT, UUID) TO authenticated, anon;
