-- ============================================================================
-- Migration: Add match result audit history for admin review
-- ============================================================================

CREATE TABLE IF NOT EXISTS match_result_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  before_match JSONB,
  after_match JSONB,
  before_stats JSONB,
  after_stats JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_result_audits_match_created
  ON match_result_audits (match_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_result_audits_editor_created
  ON match_result_audits (editor_id, created_at DESC);

ALTER TABLE match_result_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and staff can view match result audits" ON match_result_audits;
DROP POLICY IF EXISTS "Participants can insert match result audits" ON match_result_audits;

CREATE POLICY "Admins and staff can view match result audits"
  ON match_result_audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Participants can insert match result audits"
  ON match_result_audits FOR INSERT
  WITH CHECK (
    auth.uid() = editor_id
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'staff')
      )
      OR EXISTS (
        SELECT 1
        FROM matches m
        JOIN team_rosters tr
          ON (tr.team_id = m.home_team_id OR tr.team_id = m.away_team_id)
        WHERE m.id = match_result_audits.match_id
          AND tr.player_id = auth.uid()
          AND tr.is_active = true
          AND tr.season_id = m.season_id
      )
    )
  );

COMMENT ON TABLE match_result_audits IS 'Audit trail of match result submissions/edits/forfeits';
