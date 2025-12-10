-- ============================================================================
-- Migration 012: Fix Standings Update Trigger and Re-backfill
-- ============================================================================
-- Fixes issue where teams.wins/losses remain 0 despite finished matches
-- Drops and recreates trigger, then re-backfills all standings from matches
-- ============================================================================

-- Step 1: Drop existing trigger to ensure clean state
DROP TRIGGER IF EXISTS update_team_standings_on_matches ON matches;
DROP TRIGGER IF EXISTS trigger_update_standings ON matches;

-- Step 2: Recreate the standings update function
CREATE OR REPLACE FUNCTION update_team_standings()
RETURNS TRIGGER AS $$
BEGIN
    -- Only when moving into finished status
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status <> 'finished') THEN
        -- Update home team
        UPDATE teams
        SET
            wins = wins + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
            points_for = points_for + NEW.home_score,
            points_against = points_against + NEW.away_score,
            updated_at = NOW()
        WHERE id = NEW.home_team_id;

        -- Update away team
        UPDATE teams
        SET
            wins = wins + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
            points_for = points_for + NEW.away_score,
            points_against = points_against + NEW.home_score,
            updated_at = NOW()
        WHERE id = NEW.away_team_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on matches table
CREATE TRIGGER update_team_standings_on_matches
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_team_standings();

-- Step 4: Reset all team standings to zero (clean slate)
UPDATE teams
SET wins = 0,
    losses = 0,
    points_for = 0,
    points_against = 0,
    updated_at = NOW();

-- Step 5: Re-backfill standings from all finished matches
WITH home_stats AS (
    SELECT
        home_team_id as team_id,
        SUM(CASE WHEN home_score > away_score THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN home_score < away_score THEN 1 ELSE 0 END) as losses,
        SUM(home_score) as points_for,
        SUM(away_score) as points_against
    FROM matches
    WHERE status = 'finished'
    GROUP BY home_team_id
),
away_stats AS (
    SELECT
        away_team_id as team_id,
        SUM(CASE WHEN away_score > home_score THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN away_score < home_score THEN 1 ELSE 0 END) as losses,
        SUM(away_score) as points_for,
        SUM(home_score) as points_against
    FROM matches
    WHERE status = 'finished'
    GROUP BY away_team_id
),
combined_stats AS (
    SELECT team_id,
           COALESCE(SUM(wins), 0) as total_wins,
           COALESCE(SUM(losses), 0) as total_losses,
           COALESCE(SUM(points_for), 0) as total_points_for,
           COALESCE(SUM(points_against), 0) as total_points_against
    FROM (
        SELECT * FROM home_stats
        UNION ALL
        SELECT * FROM away_stats
    ) all_stats
    GROUP BY team_id
)
UPDATE teams t
SET wins = cs.total_wins,
    losses = cs.total_losses,
    points_for = cs.total_points_for,
    points_against = cs.total_points_against,
    updated_at = NOW()
FROM combined_stats cs
WHERE t.id = cs.team_id;

-- Step 6: Verify the backfill worked (output for verification)
-- This will show team standings after backfill
DO $$
DECLARE
    team_record RECORD;
    total_teams INTEGER;
    teams_with_games INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_teams FROM teams;
    SELECT COUNT(DISTINCT id) INTO teams_with_games
    FROM teams
    WHERE wins > 0 OR losses > 0;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Standings Update Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total teams: %', total_teams;
    RAISE NOTICE 'Teams with game records: %', teams_with_games;
    RAISE NOTICE '==============================================';

    FOR team_record IN
        SELECT t.name, t.wins, t.losses, t.points_for, t.points_against
        FROM teams t
        JOIN seasons s ON t.season_id = s.id
        WHERE s.is_active = true
        ORDER BY t.wins DESC, t.points_for DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '% - W:% L:% PF:% PA:%',
            team_record.name,
            team_record.wins,
            team_record.losses,
            team_record.points_for,
            team_record.points_against;
    END LOOP;
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK INSTRUCTIONS (if needed):
-- This migration is safe to re-run. If issues occur:
-- 1. Check that matches have status='finished'
-- 2. Verify home_score and away_score are not null
-- 3. Re-run this entire migration script
