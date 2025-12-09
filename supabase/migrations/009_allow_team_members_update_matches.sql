-- ============================================================================
-- Migration: Allow Team Members to Update Match Results
-- ============================================================================
-- Allows team members to update matches table (status, scores, stream URLs)
-- when they upload match results for their team's games.
-- ============================================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Admins and staff can update matches" ON matches;
DROP POLICY IF EXISTS "Admins, staff, and team members can update matches" ON matches;

-- Create new policy: Admins, staff, AND team members can update matches
CREATE POLICY "Admins, staff, and team members can update matches"
    ON matches FOR UPDATE
    USING (
        -- Allow admins and staff (original behavior)
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
        OR
        -- Allow team members who are in the roster of either home or away team
        EXISTS (
            SELECT 1 FROM team_rosters tr
            WHERE (tr.team_id = matches.home_team_id OR tr.team_id = matches.away_team_id)
              AND tr.player_id = auth.uid()
              AND tr.is_active = true
              AND tr.season_id = matches.season_id
        )
    );
