-- Real-time messaging system (Discord-style DM)
-- Supports 1:1 conversations between players with real-time updates

-- DM conversations table (unique per pair of users)
CREATE TABLE dm_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (user1_id < user2_id), -- Ensure user1_id is always the smaller UUID
    UNIQUE(user1_id, user2_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_dm_conversations_user1 ON dm_conversations(user1_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_dm_conversations_user2 ON dm_conversations(user2_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_dm_conversations_last_message ON dm_conversations(last_message_at DESC NULLS LAST);

-- Messages table
CREATE TABLE dm_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_dm_messages_conversation ON dm_messages(conversation_id, sent_at DESC);
CREATE INDEX idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX idx_dm_messages_sent_at ON dm_messages(sent_at DESC);

-- Unread message counts per conversation per user
CREATE TABLE dm_unread_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0 CHECK (unread_count >= 0),
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_dm_unread_user ON dm_unread_counts(user_id, unread_count DESC);
CREATE INDEX idx_dm_unread_conversation ON dm_unread_counts(conversation_id, user_id);

-- Function: Update conversation's last_message_at when a message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation's last message timestamp
    UPDATE dm_conversations
    SET
        last_message_at = NEW.sent_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    -- Increment unread count for the recipient
    INSERT INTO dm_unread_counts (conversation_id, user_id, unread_count)
    SELECT
        NEW.conversation_id,
        CASE
            WHEN c.user1_id = NEW.sender_id THEN c.user2_id
            ELSE c.user1_id
        END as recipient_id,
        1
    FROM dm_conversations c
    WHERE c.id = NEW.conversation_id
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET
        unread_count = dm_unread_counts.unread_count + 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when message is sent
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON dm_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Function: Reset unread count when user reads messages
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
BEGIN
    INSERT INTO dm_unread_counts (conversation_id, user_id, unread_count, last_read_at)
    VALUES (p_conversation_id, p_user_id, 0, NOW())
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET
        unread_count = 0,
        last_read_at = NOW();

    -- Mark messages as read
    UPDATE dm_messages
    SET is_read = true
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND is_read = false;
END;
$$ LANGUAGE plpgsql;

-- Function: Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_smaller_id UUID;
    v_larger_id UUID;
BEGIN
    -- Ensure user1_id < user2_id for consistent ordering
    IF p_user1_id < p_user2_id THEN
        v_smaller_id := p_user1_id;
        v_larger_id := p_user2_id;
    ELSE
        v_smaller_id := p_user2_id;
        v_larger_id := p_user1_id;
    END IF;

    -- Try to get existing conversation
    SELECT id INTO v_conversation_id
    FROM dm_conversations
    WHERE user1_id = v_smaller_id AND user2_id = v_larger_id;

    -- If not found, create new conversation
    IF v_conversation_id IS NULL THEN
        INSERT INTO dm_conversations (user1_id, user2_id)
        VALUES (v_smaller_id, v_larger_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for real-time messaging
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_unread_counts;

-- RLS Policies
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_unread_counts ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can view their own conversations
CREATE POLICY "Users can view their conversations"
    ON dm_conversations FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Conversations: Users can create conversations with others
CREATE POLICY "Users can create conversations"
    ON dm_conversations FOR INSERT
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON dm_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dm_conversations c
            WHERE c.id = conversation_id
              AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Messages: Users can send messages
CREATE POLICY "Users can send messages"
    ON dm_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM dm_conversations c
            WHERE c.id = conversation_id
              AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Unread counts: Users can view their own unread counts
CREATE POLICY "Users can view their unread counts"
    ON dm_unread_counts FOR SELECT
    USING (auth.uid() = user_id);

-- Unread counts: System can manage unread counts (via triggers)
CREATE POLICY "System can manage unread counts"
    ON dm_unread_counts FOR ALL
    USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dm_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_dm_conversations_updated_at
BEFORE UPDATE ON dm_conversations
FOR EACH ROW
EXECUTE FUNCTION update_dm_conversations_updated_at();

-- Comments for documentation
COMMENT ON TABLE dm_conversations IS 'Direct message conversations between two users';
COMMENT ON TABLE dm_messages IS 'Messages in DM conversations with real-time support';
COMMENT ON TABLE dm_unread_counts IS 'Tracks unread message counts per user per conversation';
COMMENT ON COLUMN dm_conversations.user1_id IS 'Smaller UUID of the two users (for consistency)';
COMMENT ON COLUMN dm_conversations.user2_id IS 'Larger UUID of the two users (for consistency)';
COMMENT ON COLUMN dm_messages.content IS 'Message content (max 2000 characters)';
