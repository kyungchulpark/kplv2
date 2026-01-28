-- ============================================================================
-- Migration: Ensure teams are selectable for all seasons (including withdrawn)
-- ============================================================================
-- Past seasons often include withdrawn/disbanded teams that still need to show
-- in standings and match detail screens.
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;

CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

