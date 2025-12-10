-- ============================================================================
-- Migration 021: Scope recalculate_team_standings to season and add safeguard
-- ============================================================================
-- - Adds season parameter to avoid blanket UPDATE
-- - Keeps admin-only guard and forfeit-aware aggregation
-- ============================================================================

DROP FUNCTION IF EXISTS recalculate_team_standings() CASCADE;

CREATE OR REPLACE FUNCTION recalculate_team_standings(p_season_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    is_admin BOOLEAN;
    v_season_id UUID;
BEGIN
    -- Enforce admin role
    SELECT EXISTS(
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can recalculate standings';
    END IF;

    -- Resolve target season (passed in or active season)
    IF p_season_id IS NOT NULL THEN
        v_season_id := p_season_id;
    ELSE
        SELECT id INTO v_season_id FROM seasons WHERE is_active = true LIMIT 1;
    END IF;

    IF v_season_id IS NULL THEN
        RAISE EXCEPTION 'No season found to recalculate';
    END IF;

    -- Reset standings for the season
    UPDATE teams
    SET wins = 0,
        losses = 0,
        points = 0,
        points_for = 0,
        points_against = 0,
        updated_at = NOW()
    WHERE season_id = v_season_id;

    -- Aggregate finished matches for the season
    WITH finished_matches AS (
        SELECT *
        FROM matches
        WHERE status = 'finished'
          AND season_id = v_season_id
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
    WHERE t.id = a.team_id
      AND t.season_id = v_season_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION recalculate_team_standings(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_team_standings(UUID) TO authenticated;

-- ROLLBACK (if needed):
-- DROP FUNCTION IF EXISTS recalculate_team_standings(UUID) CASCADE;
