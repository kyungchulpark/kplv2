-- ============================================================================
-- Migration: Add broadcast notice history for admin-wide announcements
-- ============================================================================

CREATE TABLE IF NOT EXISTS broadcast_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  total_recipients INTEGER NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  delivered INTEGER NOT NULL DEFAULT 0 CHECK (delivered >= 0),
  failed INTEGER NOT NULL DEFAULT 0 CHECK (failed >= 0),
  failure_samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_notices_created_at
  ON broadcast_notices (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_notices_sender_created
  ON broadcast_notices (sender_id, created_at DESC);

ALTER TABLE broadcast_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view broadcast notices" ON broadcast_notices;
DROP POLICY IF EXISTS "Admins can insert broadcast notices" ON broadcast_notices;

CREATE POLICY "Admins can view broadcast notices"
  ON broadcast_notices FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert broadcast notices"
  ON broadcast_notices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE broadcast_notices IS 'Admin broadcast notice history for audit and troubleshooting';

