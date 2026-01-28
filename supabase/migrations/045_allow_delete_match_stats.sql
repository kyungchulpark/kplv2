-- ============================================================================
-- Migration: Allow authorized users to delete match stats for editing
-- ============================================================================
-- Editing existing results requires clearing prior match_stats rows. This
-- policy mirrors the existing insert/update policies for match_stats.
-- ============================================================================

DROP POLICY IF EXISTS "Admins, staff, and team members can delete match stats"
  ON match_stats;

CREATE POLICY "Admins, staff, and team members can delete match stats"
  ON match_stats FOR DELETE
  USING (
    -- Admins and staff can always delete
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR
    -- Team members on either side of the match can delete
    EXISTS (
      SELECT 1
      FROM matches m
      JOIN team_rosters tr
        ON (tr.team_id = m.home_team_id OR tr.team_id = m.away_team_id)
      WHERE m.id = match_stats.match_id
        AND tr.player_id = auth.uid()
        AND tr.is_active = true
        AND tr.season_id = m.season_id
    )
  );

