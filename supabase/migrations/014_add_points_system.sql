-- ============================================================================
-- Migration 014: Add Points System (승점 시스템)
-- ============================================================================
-- Adds points-based ranking system to replace win rate ranking
-- Formula: Win = 2 points, Loss = 1 point, Forfeit Win = 2, Forfeit Loss = 0
-- Ranking: Points → Head-to-head → Average Points Scored
-- ============================================================================

-- Step 1: Add points column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Step 2: Add head_to_head JSONB column for tie-breaking
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS head_to_head JSONB DEFAULT '{}'::jsonb;

-- Step 3: Create index for points-based ranking
CREATE INDEX IF NOT EXISTS idx_teams_points_ranking
ON teams(season_id, points DESC, points_for DESC);

-- Step 4: Update the standings trigger function to calculate points
DROP FUNCTION IF EXISTS update_team_standings() CASCADE;

CREATE OR REPLACE FUNCTION update_team_standings()
RETURNS TRIGGER AS $$
BEGIN
    -- Only when moving into finished status
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status <> 'finished') THEN

        -- Check if it's a forfeit match (will be used in future migration)
        -- For now, all matches are normal matches (not forfeit)
        -- Normal match: Winner gets 2 points, loser gets 1 point

        -- Home team
        UPDATE teams
        SET
            wins = wins + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
            points = points + CASE WHEN NEW.home_score > NEW.away_score THEN 2 ELSE 1 END,
            points_for = points_for + NEW.home_score,
            points_against = points_against + NEW.away_score,
            updated_at = NOW()
        WHERE id = NEW.home_team_id;

        -- Away team
        UPDATE teams
        SET
            wins = wins + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
            points = points + CASE WHEN NEW.away_score > NEW.home_score THEN 2 ELSE 1 END,
            points_for = points_for + NEW.away_score,
            points_against = points_against + NEW.home_score,
            updated_at = NOW()
        WHERE id = NEW.away_team_id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS update_team_standings_on_matches ON matches;
CREATE TRIGGER update_team_standings_on_matches
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_team_standings();

-- Step 6: Backfill points for existing matches
-- Reset points to 0 first
UPDATE teams SET points = 0, updated_at = NOW();

-- Calculate points from finished matches
WITH match_points AS (
    SELECT
        team_id,
        SUM(team_points) as total_points
    FROM (
        -- Home team points
        SELECT
            home_team_id as team_id,
            CASE
                WHEN home_score > away_score THEN 2
                ELSE 1
            END as team_points
        FROM matches
        WHERE status = 'finished'

        UNION ALL

        -- Away team points
        SELECT
            away_team_id as team_id,
            CASE
                WHEN away_score > home_score THEN 2
                ELSE 1
            END as team_points
        FROM matches
        WHERE status = 'finished'
    ) all_results
    GROUP BY team_id
)
UPDATE teams t
SET points = COALESCE(mp.total_points, 0),
    updated_at = NOW()
FROM match_points mp
WHERE t.id = mp.team_id;

-- Step 7: Update current_standings view to use points
DROP VIEW IF EXISTS current_standings;

CREATE OR REPLACE VIEW current_standings AS
SELECT
    t.id,
    t.name AS team_name,
    t.logo_url,
    t.conference,
    t.wins,
    t.losses,
    t.wins + t.losses AS games_played,
    t.points AS points, -- New: Points column
    CASE
        WHEN (t.wins + t.losses) = 0 THEN 0
        ELSE ROUND((t.wins::NUMERIC / (t.wins + t.losses) * 100), 1)
    END AS win_rate,
    t.points_for,
    t.points_against,
    CASE
        WHEN (t.wins + t.losses) = 0 THEN 0
        ELSE ROUND((t.points_for::NUMERIC / (t.wins + t.losses)), 1)
    END AS ppg, -- Points Per Game (avg scored)
    CASE
        WHEN (t.wins + t.losses) = 0 THEN 0
        ELSE ROUND((t.points_against::NUMERIC / (t.wins + t.losses)), 1)
    END AS papg, -- Points Against Per Game
    CASE
        WHEN (t.wins + t.losses) = 0 THEN 0
        ELSE ROUND((t.points_for - t.points_against)::NUMERIC / (t.wins + t.losses), 1)
    END AS margin,
    s.name AS season_name
FROM teams t
JOIN seasons s ON t.season_id = s.id
WHERE s.is_active = true
ORDER BY
    t.points DESC,  -- Primary: Points (승점)
    t.wins DESC,    -- Secondary: Wins
    ppg DESC;       -- Tertiary: Average points scored

-- Step 8: Verify the backfill
DO $$
DECLARE
    team_record RECORD;
    total_teams INTEGER;
    teams_with_points INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_teams FROM teams;
    SELECT COUNT(DISTINCT id) INTO teams_with_points
    FROM teams
    WHERE points > 0;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Points System Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total teams: %', total_teams;
    RAISE NOTICE 'Teams with points: %', teams_with_points;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Top 10 Teams by Points:';
    RAISE NOTICE '==============================================';

    FOR team_record IN
        SELECT t.name, t.wins, t.losses, t.points, t.points_for, t.points_against
        FROM teams t
        JOIN seasons s ON t.season_id = s.id
        WHERE s.is_active = true
        ORDER BY t.points DESC, t.wins DESC, t.points_for DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '% - W:% L:% Pts:% PF:% PA:%',
            team_record.name,
            team_record.wins,
            team_record.losses,
            team_record.points,
            team_record.points_for,
            team_record.points_against;
    END LOOP;
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- ALTER TABLE teams DROP COLUMN IF EXISTS points;
-- ALTER TABLE teams DROP COLUMN IF EXISTS head_to_head;
-- DROP INDEX IF EXISTS idx_teams_points_ranking;
-- Then recreate old trigger without points calculation
