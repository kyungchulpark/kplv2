-- ============================================================================
-- Migration 020: Fix standings updates and add admin recalc helper
-- ============================================================================
-- - Makes update_team_standings idempotent (handles edits/resets)
-- - Applies win/loss/points rules for normal + forfeit games
-- - Adds recalculate_team_standings() for admins to backfill standings
-- ============================================================================

-- Drop old trigger/function so we can recreate cleanly
DROP TRIGGER IF EXISTS update_team_standings_on_matches ON matches;
DROP TRIGGER IF EXISTS trigger_update_standings ON matches;
DROP FUNCTION IF EXISTS update_team_standings() CASCADE;

-- --------------------------------------------------------------------------
-- Robust trigger: remove previous result first, then apply the new one
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_team_standings()
RETURNS TRIGGER AS $$
DECLARE
    old_is_forfeit BOOLEAN;
    new_is_forfeit BOOLEAN;
    old_winner UUID;
    old_loser UUID;
    new_winner UUID;
    new_loser UUID;
BEGIN
    -- 1) Revert OLD finished result (when editing or resetting)
    IF TG_OP = 'UPDATE' AND OLD.status = 'finished' THEN
        old_is_forfeit := COALESCE(OLD.is_forfeit, false) AND OLD.forfeit_winner_id IS NOT NULL;

        IF old_is_forfeit THEN
            old_winner := OLD.forfeit_winner_id;
            old_loser := CASE
                WHEN OLD.forfeit_winner_id = OLD.home_team_id THEN OLD.away_team_id
                ELSE OLD.home_team_id
            END;

            -- Winner: -1W, -2pts
            UPDATE teams
            SET wins = wins - 1,
                points = points - 2,
                updated_at = NOW()
            WHERE id = old_winner;

            -- Loser: -1L (no points were given)
            UPDATE teams
            SET losses = losses - 1,
                updated_at = NOW()
            WHERE id = old_loser;
        ELSE
            -- Normal game revert (scores counted)
            IF OLD.home_score IS NULL OR OLD.away_score IS NULL THEN
                RAISE EXCEPTION 'Finished matches must have scores (old record missing scores)';
            END IF;

            old_winner := CASE
                WHEN OLD.home_score > OLD.away_score THEN OLD.home_team_id
                ELSE OLD.away_team_id
            END;
            old_loser := CASE
                WHEN OLD.home_score > OLD.away_score THEN OLD.away_team_id
                ELSE OLD.home_team_id
            END;

            -- Winner: -1W, -2pts, remove PF/PA
            UPDATE teams
            SET wins = wins - 1,
                points = points - 2,
                points_for = points_for - CASE WHEN id = OLD.home_team_id THEN COALESCE(OLD.home_score, 0) ELSE COALESCE(OLD.away_score, 0) END,
                points_against = points_against - CASE WHEN id = OLD.home_team_id THEN COALESCE(OLD.away_score, 0) ELSE COALESCE(OLD.home_score, 0) END,
                updated_at = NOW()
            WHERE id = old_winner;

            -- Loser: -1L, -1pt, remove PF/PA
            UPDATE teams
            SET losses = losses - 1,
                points = points - 1,
                points_for = points_for - CASE WHEN id = OLD.home_team_id THEN COALESCE(OLD.home_score, 0) ELSE COALESCE(OLD.away_score, 0) END,
                points_against = points_against - CASE WHEN id = OLD.home_team_id THEN COALESCE(OLD.away_score, 0) ELSE COALESCE(OLD.home_score, 0) END,
                updated_at = NOW()
            WHERE id = old_loser;
        END IF;
    END IF;

    -- 2) Apply NEW result if it is finished
    IF NEW.status = 'finished' THEN
        new_is_forfeit := COALESCE(NEW.is_forfeit, false) AND NEW.forfeit_winner_id IS NOT NULL;

        IF new_is_forfeit THEN
            new_winner := NEW.forfeit_winner_id;
            new_loser := CASE
                WHEN NEW.forfeit_winner_id = NEW.home_team_id THEN NEW.away_team_id
                ELSE NEW.home_team_id
            END;

            -- Winner: +1W, +2pts (no PF/PA)
            UPDATE teams
            SET wins = wins + 1,
                points = points + 2,
                updated_at = NOW()
            WHERE id = new_winner;

            -- Loser: +1L, +0pts
            UPDATE teams
            SET losses = losses + 1,
                updated_at = NOW()
            WHERE id = new_loser;
        ELSE
            IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
                RAISE EXCEPTION 'Finished matches must include scores';
            END IF;

            -- Home team update
            UPDATE teams
            SET wins = wins + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
                points = points + CASE WHEN NEW.home_score > NEW.away_score THEN 2 ELSE 1 END,
                points_for = points_for + COALESCE(NEW.home_score, 0),
                points_against = points_against + COALESCE(NEW.away_score, 0),
                updated_at = NOW()
            WHERE id = NEW.home_team_id;

            -- Away team update
            UPDATE teams
            SET wins = wins + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
                points = points + CASE WHEN NEW.away_score > NEW.home_score THEN 2 ELSE 1 END,
                points_for = points_for + COALESCE(NEW.away_score, 0),
                points_against = points_against + COALESCE(NEW.home_score, 0),
                updated_at = NOW()
            WHERE id = NEW.away_team_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fire on both insert and update so freshly-created finished games are counted
CREATE TRIGGER update_team_standings_on_matches
AFTER INSERT OR UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_team_standings();

-- --------------------------------------------------------------------------
-- Admin helper: full standings backfill (handles forfeit rules)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_team_standings()
RETURNS VOID AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Enforce admin role
    SELECT EXISTS(
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can recalculate standings';
    END IF;

    -- Reset everything
    UPDATE teams
    SET wins = 0,
        losses = 0,
        points = 0,
        points_for = 0,
        points_against = 0,
        updated_at = NOW();

    -- Aggregate contributions from finished matches
    WITH finished_matches AS (
        SELECT *
        FROM matches
        WHERE status = 'finished'
    ),
    team_contribs AS (
        -- Home side
        SELECT
            home_team_id AS team_id,
            CASE
                WHEN COALESCE(is_forfeit, false) AND forfeit_winner_id = home_team_id THEN 1
                WHEN NOT COALESCE(is_forfeit, false) AND COALESCE(home_score, 0) > COALESCE(away_score, 0) THEN 1
                ELSE 0
            END AS wins,
            CASE
                WHEN COALESCE(is_forfeit, false) AND forfeit_winner_id = home_team_id THEN 0
                WHEN COALESCE(is_forfeit, false) THEN 1
                WHEN NOT COALESCE(is_forfeit, false) AND COALESCE(home_score, 0) < COALESCE(away_score, 0) THEN 1
                ELSE 0
            END AS losses,
            CASE
                WHEN COALESCE(is_forfeit, false) AND forfeit_winner_id = home_team_id THEN 2
                WHEN COALESCE(is_forfeit, false) THEN 0
                WHEN COALESCE(home_score, 0) > COALESCE(away_score, 0) THEN 2
                ELSE 1
            END AS points,
            CASE WHEN COALESCE(is_forfeit, false) THEN 0 ELSE COALESCE(home_score, 0) END AS points_for,
            CASE WHEN COALESCE(is_forfeit, false) THEN 0 ELSE COALESCE(away_score, 0) END AS points_against
        FROM finished_matches

        UNION ALL

        -- Away side
        SELECT
            away_team_id AS team_id,
            CASE
                WHEN COALESCE(is_forfeit, false) AND forfeit_winner_id = away_team_id THEN 1
                WHEN NOT COALESCE(is_forfeit, false) AND COALESCE(away_score, 0) > COALESCE(home_score, 0) THEN 1
                ELSE 0
            END AS wins,
            CASE
                WHEN COALESCE(is_forfeit, false) AND forfeit_winner_id = away_team_id THEN 0
                WHEN COALESCE(is_forfeit, false) THEN 1
                WHEN NOT COALESCE(is_forfeit, false) AND COALESCE(away_score, 0) < COALESCE(home_score, 0) THEN 1
                ELSE 0
            END AS losses,
            CASE
                WHEN COALESCE(is_forfeit, false) AND forfeit_winner_id = away_team_id THEN 2
                WHEN COALESCE(is_forfeit, false) THEN 0
                WHEN COALESCE(away_score, 0) > COALESCE(home_score, 0) THEN 2
                ELSE 1
            END AS points,
            CASE WHEN COALESCE(is_forfeit, false) THEN 0 ELSE COALESCE(away_score, 0) END AS points_for,
            CASE WHEN COALESCE(is_forfeit, false) THEN 0 ELSE COALESCE(home_score, 0) END AS points_against
        FROM finished_matches
    ),
    aggregated AS (
        SELECT
            team_id,
            SUM(wins) AS wins,
            SUM(losses) AS losses,
            SUM(points) AS points,
            SUM(points_for) AS points_for,
            SUM(points_against) AS points_against
        FROM team_contribs
        GROUP BY team_id
    )
    UPDATE teams t
    SET wins = COALESCE(a.wins, 0),
        losses = COALESCE(a.losses, 0),
        points = COALESCE(a.points, 0),
        points_for = COALESCE(a.points_for, 0),
        points_against = COALESCE(a.points_against, 0),
        updated_at = NOW()
    FROM aggregated a
    WHERE t.id = a.team_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION recalculate_team_standings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_team_standings() TO authenticated;

-- --------------------------------------------------------------------------
-- Verify hooks
-- --------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Standings trigger rebuilt with forfeit + idempotent logic';
    RAISE NOTICE 'Admin helper recalculate_team_standings() created';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- DROP TRIGGER IF EXISTS update_team_standings_on_matches ON matches;
-- DROP FUNCTION IF EXISTS update_team_standings() CASCADE;
-- DROP FUNCTION IF EXISTS recalculate_team_standings() CASCADE;
