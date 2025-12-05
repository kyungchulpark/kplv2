-- ============================================================================
-- KPL (Korea Pro League) Database Schema
-- ============================================================================
-- This schema supports NBA 2K Online League Management System
-- with Season-based data separation and proper relationships
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE (User Management)
-- ============================================================================
-- Extends Supabase auth.users with custom profile data
-- Persists across seasons (users are not reset)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    psn_id TEXT UNIQUE NOT NULL, -- PlayStation Network ID
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_profiles_psn_id ON profiles(psn_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- 2. SEASONS TABLE (Season Management)
-- ============================================================================
-- Each season represents a new competitive period
-- Only one season can be active at a time
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., '2K26 Season 1', '2K26 1st'
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_end_date CHECK (end_date IS NULL OR end_date > start_date)
);

-- Ensure only one active season at a time
CREATE UNIQUE INDEX idx_seasons_active ON seasons(is_active) WHERE is_active = true;
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);

-- ============================================================================
-- 3. TEAMS TABLE (Team Management)
-- ============================================================================
-- Teams are season-specific and reset when a new season starts
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    conference TEXT NOT NULL CHECK (conference IN ('West', 'East')),
    captain_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    -- Standings data (calculated from matches)
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    points_for INTEGER NOT NULL DEFAULT 0, -- Total points scored
    points_against INTEGER NOT NULL DEFAULT 0, -- Total points conceded
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(season_id, name) -- Team names must be unique per season
);

-- Indexes for performance
CREATE INDEX idx_teams_season ON teams(season_id);
CREATE INDEX idx_teams_captain ON teams(captain_id);
CREATE INDEX idx_teams_conference ON teams(season_id, conference);
CREATE INDEX idx_teams_standings ON teams(season_id, wins DESC, losses ASC);

-- ============================================================================
-- 4. TEAM_ROSTERS TABLE (Player-Team Association)
-- ============================================================================
-- Links players to teams for a specific season
-- Allows tracking player movements between seasons
CREATE TABLE team_rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    jersey_number INTEGER,
    position TEXT, -- e.g., 'PG', 'SG', 'SF', 'PF', 'C'
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(season_id, team_id, player_id) -- Player can't be on same team twice in same season
);

-- Indexes
CREATE INDEX idx_rosters_season ON team_rosters(season_id);
CREATE INDEX idx_rosters_team ON team_rosters(team_id);
CREATE INDEX idx_rosters_player ON team_rosters(player_id);
CREATE INDEX idx_rosters_active ON team_rosters(team_id, is_active);

-- ============================================================================
-- 5. MATCHES TABLE (Match Schedule & Results)
-- ============================================================================
-- Stores match information with home/away teams
-- Schedule: Tue/Thu/Sun at 22:40 and 23:20 KST
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    match_date TIMESTAMPTZ NOT NULL, -- Scheduled match time
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
    home_score INTEGER,
    away_score INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_different_teams CHECK (home_team_id != away_team_id),
    CONSTRAINT check_scores_when_finished CHECK (
        status != 'finished' OR (home_score IS NOT NULL AND away_score IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_matches_season ON matches(season_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);

-- ============================================================================
-- 6. MATCH_STATS TABLE (Individual Player Performance)
-- ============================================================================
-- Stores detailed statistics for each player in a match
-- Each match has 10 entries (5 vs 5)
-- Stats are extracted from NBA 2K game result screenshots
CREATE TABLE match_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

    -- Player Grade (e.g., 'A+', 'B', 'C-')
    grade TEXT,

    -- Basic Stats
    pts INTEGER NOT NULL DEFAULT 0, -- Points
    reb INTEGER NOT NULL DEFAULT 0, -- Rebounds
    ast INTEGER NOT NULL DEFAULT 0, -- Assists
    stl INTEGER NOT NULL DEFAULT 0, -- Steals
    blk INTEGER NOT NULL DEFAULT 0, -- Blocks
    fls INTEGER NOT NULL DEFAULT 0, -- Fouls
    turnovers INTEGER NOT NULL DEFAULT 0,  -- Turnovers

    -- Shooting Stats
    fgm INTEGER NOT NULL DEFAULT 0, -- Field Goals Made (includes 2PT + 3PT)
    fga INTEGER NOT NULL DEFAULT 0, -- Field Goals Attempted
    three_pm INTEGER NOT NULL DEFAULT 0, -- 3-Pointers Made
    three_pa INTEGER NOT NULL DEFAULT 0, -- 3-Pointers Attempted
    ftm INTEGER NOT NULL DEFAULT 0, -- Free Throws Made
    fta INTEGER NOT NULL DEFAULT 0, -- Free Throws Attempted

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validation Constraints (from CLAUDE.md)
    CONSTRAINT check_fg CHECK (fgm <= fga AND fgm >= 0 AND fga >= 0),
    CONSTRAINT check_three CHECK (three_pm <= three_pa AND three_pm >= 0 AND three_pa >= 0),
    CONSTRAINT check_ft CHECK (ftm <= fta AND ftm >= 0 AND fta >= 0),
    CONSTRAINT check_three_in_fg CHECK (three_pm <= fgm), -- 3PM must be part of FGM

    -- Points calculation validation: Points = (FGM-3PM)*2 + 3PM*3 + FTM
    CONSTRAINT check_points_calculation CHECK (
        pts = (fgm - three_pm) * 2 + three_pm * 3 + ftm
    ),

    -- Ensure one player appears only once per match
    UNIQUE(match_id, player_id)
);

-- Indexes
CREATE INDEX idx_match_stats_match ON match_stats(match_id);
CREATE INDEX idx_match_stats_team ON match_stats(team_id);
CREATE INDEX idx_match_stats_player ON match_stats(player_id);
CREATE INDEX idx_match_stats_player_season ON match_stats(player_id, match_id);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Current Season Standings
CREATE OR REPLACE VIEW current_standings AS
SELECT
    t.id,
    t.name AS team_name,
    t.logo_url,
    t.conference,
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
    s.name AS season_name
FROM teams t
JOIN seasons s ON t.season_id = s.id
WHERE s.is_active = true
ORDER BY win_rate DESC, t.wins DESC, margin DESC, t.points_for DESC;

-- View: Player Season Stats (Aggregated)
CREATE OR REPLACE VIEW player_season_stats AS
SELECT
    p.id AS player_id,
    p.psn_id,
    s.id AS season_id,
    s.name AS season_name,
    t.id AS team_id,
    t.name AS team_name,
    COUNT(ms.id) AS games_played,
    ROUND(AVG(ms.pts), 1) AS ppg,
    ROUND(AVG(ms.reb), 1) AS rpg,
    ROUND(AVG(ms.ast), 1) AS apg,
    ROUND(AVG(ms.stl), 1) AS spg,
    ROUND(AVG(ms.blk), 1) AS bpg,
    ROUND(AVG(ms.turnovers), 1) AS tpg,
    SUM(ms.fgm) AS total_fgm,
    SUM(ms.fga) AS total_fga,
    CASE
        WHEN SUM(ms.fga) = 0 THEN 0
        ELSE ROUND((SUM(ms.fgm)::NUMERIC / SUM(ms.fga) * 100), 1)
    END AS fg_pct,
    SUM(ms.three_pm) AS total_3pm,
    SUM(ms.three_pa) AS total_3pa,
    CASE
        WHEN SUM(ms.three_pa) = 0 THEN 0
        ELSE ROUND((SUM(ms.three_pm)::NUMERIC / SUM(ms.three_pa) * 100), 1)
    END AS three_pct,
    SUM(ms.ftm) AS total_ftm,
    SUM(ms.fta) AS total_fta,
    CASE
        WHEN SUM(ms.fta) = 0 THEN 0
        ELSE ROUND((SUM(ms.ftm)::NUMERIC / SUM(ms.fta) * 100), 1)
    END AS ft_pct
FROM profiles p
JOIN match_stats ms ON p.id = ms.player_id
JOIN matches m ON ms.match_id = m.id
JOIN seasons s ON m.season_id = s.id
JOIN team_rosters tr ON tr.player_id = p.id AND tr.season_id = s.id AND tr.is_active = true
JOIN teams t ON tr.team_id = t.id
WHERE m.status = 'finished'
GROUP BY p.id, p.psn_id, s.id, s.name, t.id, t.name;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update team standings after match completion
CREATE OR REPLACE FUNCTION update_team_standings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
        -- Update home team
        UPDATE teams
        SET
            wins = CASE WHEN NEW.home_score > NEW.away_score THEN wins + 1 ELSE wins END,
            losses = CASE WHEN NEW.home_score < NEW.away_score THEN losses + 1 ELSE losses END,
            points_for = points_for + NEW.home_score,
            points_against = points_against + NEW.away_score,
            updated_at = NOW()
        WHERE id = NEW.home_team_id;

        -- Update away team
        UPDATE teams
        SET
            wins = CASE WHEN NEW.away_score > NEW.home_score THEN wins + 1 ELSE wins END,
            losses = CASE WHEN NEW.away_score < NEW.home_score THEN losses + 1 ELSE losses END,
            points_for = points_for + NEW.away_score,
            points_against = points_against + NEW.home_score,
            updated_at = NOW()
        WHERE id = NEW.away_team_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update standings when match is finished
CREATE TRIGGER trigger_update_standings
AFTER UPDATE OF status ON matches
FOR EACH ROW
EXECUTE FUNCTION update_team_standings();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SEASONS POLICIES
-- ============================================================================

-- Everyone can view seasons
CREATE POLICY "Seasons are viewable by everyone"
    ON seasons FOR SELECT
    USING (true);

-- Only admins can manage seasons
CREATE POLICY "Only admins can insert seasons"
    ON seasons FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update seasons"
    ON seasons FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete seasons"
    ON seasons FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- TEAMS POLICIES
-- ============================================================================

-- Everyone can view teams
CREATE POLICY "Teams are viewable by everyone"
    ON teams FOR SELECT
    USING (true);

-- Admins and staff can manage teams
CREATE POLICY "Admins and staff can insert teams"
    ON teams FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update teams"
    ON teams FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins can delete teams"
    ON teams FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- TEAM_ROSTERS POLICIES
-- ============================================================================

-- Everyone can view rosters
CREATE POLICY "Rosters are viewable by everyone"
    ON team_rosters FOR SELECT
    USING (true);

-- Admins and staff can manage rosters
CREATE POLICY "Admins and staff can insert rosters"
    ON team_rosters FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update rosters"
    ON team_rosters FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins and staff can delete rosters"
    ON team_rosters FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- MATCHES POLICIES
-- ============================================================================

-- Everyone can view matches
CREATE POLICY "Matches are viewable by everyone"
    ON matches FOR SELECT
    USING (true);

-- Admins and staff can manage matches
CREATE POLICY "Admins and staff can insert matches"
    ON matches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update matches"
    ON matches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins can delete matches"
    ON matches FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- MATCH_STATS POLICIES
-- ============================================================================

-- Everyone can view match stats
CREATE POLICY "Match stats are viewable by everyone"
    ON match_stats FOR SELECT
    USING (true);

-- Admins and staff can manage match stats
CREATE POLICY "Admins and staff can insert match stats"
    ON match_stats FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update match stats"
    ON match_stats FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins and staff can delete match stats"
    ON match_stats FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- Note: Cannot create index with auth.uid() as it's not IMMUTABLE
-- RLS policies will use existing primary key index on profiles(id)

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data for testing

/*
-- Insert a sample season
INSERT INTO seasons (name, start_date, is_active)
VALUES ('2K26 Season 1', '2025-01-01', true);

-- Insert sample teams (you'll need to replace season_id with actual UUID)
-- INSERT INTO teams (season_id, name, conference) VALUES
-- ('SEASON_UUID', 'Lakers', 'West'),
-- ('SEASON_UUID', 'Celtics', 'East');
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Remember to set up Supabase Auth (Google OAuth) in Supabase Dashboard
-- 2. Create a trigger to auto-create profile on user signup
-- 3. Set up storage buckets for: team logos, player avatars, match screenshots
-- 4. Consider adding indexes based on actual query patterns
-- 5. Monitor RLS policy performance with large datasets
-- ============================================================================
