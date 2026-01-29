-- ============================================================================
-- Migration: Add generic activity logs for league monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_created
  ON activity_logs (actor_id, created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and staff can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON activity_logs;

CREATE POLICY "Admins and staff can view activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can insert their own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    )
  );

COMMENT ON TABLE activity_logs IS 'Generic activity logs for league monitoring';
