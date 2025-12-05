-- ============================================================================
-- KPL Schema Updates
-- ============================================================================
-- Run these SQL commands in Supabase SQL Editor to update existing schema
-- ============================================================================

-- 1. Update profiles role to include 'captain'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'staff', 'captain', 'user'));

-- 2. Add region to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS region TEXT;

-- 3. Make conference nullable (for unified leagues without conferences)
ALTER TABLE teams ALTER COLUMN conference DROP NOT NULL;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_conference_check;
ALTER TABLE teams ADD CONSTRAINT teams_conference_check
    CHECK (conference IS NULL OR conference IN ('West', 'East'));

-- 4. Add game_version to seasons (e.g., '2K26', '2K25')
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS game_version TEXT;

-- 5. Add playoff_cutoff to seasons (number of teams that advance to playoffs)
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS playoff_cutoff INTEGER DEFAULT 8;

-- 6. Add team approval status for creation/deletion
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'deleted'));

-- 7. Update current_standings view to handle null conference
DROP VIEW IF EXISTS current_standings CASCADE;
CREATE OR REPLACE VIEW current_standings AS
SELECT
    t.id,
    t.name AS team_name,
    t.logo_url,
    t.conference,
    t.region,
    t.wins,
    t.losses,
    t.wins + t.losses AS games_played,
    CASE
        WHEN (t.wins + t.losses) = 0 THEN 0
        ELSE ROUND((t.wins::NUMERIC / (t.wins + t.losses) * 100), 1)
    END AS win_rate,
    t.points_for,
    t.points_against,
    CASE
        WHEN (t.wins + t.losses) = 0 THEN 0
        ELSE ROUND((t.points_for - t.points_against)::NUMERIC / (t.wins + t.losses), 1)
    END AS margin,
    s.name AS season_name,
    s.playoff_cutoff
FROM teams t
JOIN seasons s ON t.season_id = s.id
WHERE s.is_active = true AND t.status = 'active'
ORDER BY win_rate DESC, t.wins DESC, margin DESC, t.points_for DESC;

-- ============================================================================
-- Grant captain permissions
-- ============================================================================

-- Captains can create teams
DROP POLICY IF EXISTS "Captains can insert teams" ON teams;
CREATE POLICY "Captains can insert teams"
    ON teams FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff', 'captain')
        )
    );

-- Captains can update their own team
DROP POLICY IF EXISTS "Captains can update own team" ON teams;
CREATE POLICY "Captains can update own team"
    ON teams FOR UPDATE
    USING (
        captain_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Captains can manage their team roster
DROP POLICY IF EXISTS "Captains can manage own team roster" ON team_rosters;
CREATE POLICY "Captains can manage own team roster"
    ON team_rosters FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM teams
            WHERE id = team_rosters.team_id AND captain_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
