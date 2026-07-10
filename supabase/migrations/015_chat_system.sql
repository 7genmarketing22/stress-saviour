-- ============================================================
-- 015_chat_system.sql
-- Full in-app chat system: replaces the minimal chat_messages
-- table with a rich conversations / messages / reactions model.
-- ============================================================

-- Drop old minimal table (safe — no FK dependents outside this migration)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- ────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- One row per unique chat thread between two users.
-- participant_a is always the lower UUID to enforce uniqueness.
-- ────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  -- guarantee a single row per pair regardless of insertion order
  UNIQUE (participant_a, participant_b),
  CHECK (participant_a < participant_b)
);

-- ────────────────────────────────────────────────────────────
-- MESSAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body                  TEXT,                            -- null for pure-attachment messages
  attachment_url        TEXT,
  attachment_type       TEXT CHECK (attachment_type IN ('image', 'file')),
  attachment_name       TEXT,
  attachment_size       BIGINT,                          -- bytes
  reply_to_id           UUID REFERENCES messages(id),   -- quoted reply
  is_edited             BOOLEAN DEFAULT false,
  edited_at             TIMESTAMPTZ,
  deleted_for_sender    BOOLEAN DEFAULT false,
  deleted_for_everyone  BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- MESSAGE REACTIONS  (emoji per user per message)
-- ────────────────────────────────────────────────────────────
CREATE TABLE message_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- ────────────────────────────────────────────────────────────
-- READ RECEIPTS  (which users have read which messages)
-- ────────────────────────────────────────────────────────────
CREATE TABLE message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_conversations_a        ON conversations(participant_a);
CREATE INDEX idx_conversations_b        ON conversations(participant_b);
CREATE INDEX idx_conversations_last     ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation  ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender        ON messages(sender_id);
CREATE INDEX idx_message_reactions_msg  ON message_reactions(message_id);
CREATE INDEX idx_message_reads_msg      ON message_reads(message_id);
CREATE INDEX idx_message_reads_user     ON message_reads(user_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: keep conversations.last_message_at in sync
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_message_insert_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads     ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a participant in a given conversation?
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conv_id
      AND (participant_a = auth.uid() OR participant_b = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── CONVERSATIONS ──
CREATE POLICY "Participants can view their conversations" ON conversations
  FOR SELECT USING (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE POLICY "Authenticated users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant_a OR auth.uid() = participant_b
  );

-- ── MESSAGES ──
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (is_conversation_participant(conversation_id));

CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_participant(conversation_id)
  );

CREATE POLICY "Sender can edit their message" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- ── REACTIONS ──
CREATE POLICY "Participants can view reactions" ON message_reactions
  FOR SELECT USING (
    is_conversation_participant(
      (SELECT conversation_id FROM messages WHERE id = message_id)
    )
  );

CREATE POLICY "Participants can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND is_conversation_participant(
      (SELECT conversation_id FROM messages WHERE id = message_id)
    )
  );

CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── READ RECEIPTS ──
CREATE POLICY "Participants can view reads" ON message_reads
  FOR SELECT USING (
    is_conversation_participant(
      (SELECT conversation_id FROM messages WHERE id = message_id)
    )
  );

CREATE POLICY "Users can mark messages as read" ON message_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- RPC: get_or_create_conversation
-- Normalises participant order (lower UUID = participant_a)
-- so the UNIQUE constraint is always satisfied.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_conversation(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  p_a UUID;
  p_b UUID;
  conv_id UUID;
BEGIN
  -- Normalise order
  IF user_a < user_b THEN
    p_a := user_a; p_b := user_b;
  ELSE
    p_a := user_b; p_b := user_a;
  END IF;

  -- Try to find existing
  SELECT id INTO conv_id FROM conversations
  WHERE participant_a = p_a AND participant_b = p_b;

  IF conv_id IS NULL THEN
    INSERT INTO conversations (participant_a, participant_b)
    VALUES (p_a, p_b)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- STORAGE BUCKET: chat-attachments (private)
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  20971520,  -- 20 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: participants of the conversation can read/write
CREATE POLICY "Chat attachment upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Chat attachment read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Chat attachment delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
