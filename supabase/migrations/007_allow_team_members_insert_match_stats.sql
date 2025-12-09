-- ============================================================================
-- Migration: Allow Team Members to Insert Match Stats
-- ============================================================================
-- Allows team members (players in team_rosters) to insert match_stats for
-- matches their team is playing in.
-- ============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins and staff can insert match stats" ON match_stats;

-- Create new policy: Admins, staff, AND team members can insert match stats
CREATE POLICY "Admins, staff, and team members can insert match stats"
    ON match_stats FOR INSERT
    WITH CHECK (
        -- Allow admins and staff (original behavior)
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
        OR
        -- Allow team members who are in the roster of either home or away team
        EXISTS (
            SELECT 1 FROM matches m
            JOIN team_rosters tr ON (tr.team_id = m.home_team_id OR tr.team_id = m.away_team_id)
            WHERE m.id = match_stats.match_id
              AND tr.player_id = auth.uid()
              AND tr.is_active = true
              AND tr.season_id = m.season_id
        )
    );

-- Optional: Also update the UPDATE policy to allow team members to fix their own stats
DROP POLICY IF EXISTS "Admins and staff can update match stats" ON match_stats;

CREATE POLICY "Admins, staff, and team members can update match stats"
    ON match_stats FOR UPDATE
    USING (
        -- Allow admins and staff
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
        OR
        -- Allow team members who are in the roster of either home or away team
        EXISTS (
            SELECT 1 FROM matches m
            JOIN team_rosters tr ON (tr.team_id = m.home_team_id OR tr.team_id = m.away_team_id)
            WHERE m.id = match_stats.match_id
              AND tr.player_id = auth.uid()
              AND tr.is_active = true
              AND tr.season_id = m.season_id
        )
    );
