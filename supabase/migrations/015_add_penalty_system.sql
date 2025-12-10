-- ============================================================================
-- Migration 015: Add Penalty System (감점 시스템)
-- ============================================================================
-- Team-level penalties that are deducted from total points
-- Penalties can be 0.5 increments (e.g., 0.5, 1.0, 1.5, 2.0, etc.)
-- Net Points = Points - Penalties
-- ============================================================================

-- Step 1: Create team_penalties table
CREATE TABLE IF NOT EXISTS team_penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    penalty_points NUMERIC(3, 1) NOT NULL CHECK (penalty_points >= 0), -- 0.5 increments
    reason TEXT NOT NULL,
    applied_by UUID REFERENCES profiles(id),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add index for team penalties lookup
CREATE INDEX IF NOT EXISTS idx_team_penalties_team_season
ON team_penalties(team_id, season_id);

-- Step 3: Add penalty_points column to teams table (total penalties)
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS penalty_points NUMERIC(3, 1) DEFAULT 0 CHECK (penalty_points >= 0);

-- Step 4: Create function to calculate total penalties for a team
CREATE OR REPLACE FUNCTION calculate_team_penalties(p_team_id UUID)
RETURNS NUMERIC(3, 1) AS $$
DECLARE
    total_penalties NUMERIC(3, 1);
BEGIN
    SELECT COALESCE(SUM(penalty_points), 0)
    INTO total_penalties
    FROM team_penalties
    WHERE team_id = p_team_id;

    RETURN total_penalties;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger function to update team penalty_points
CREATE OR REPLACE FUNCTION update_team_penalty_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new total penalties for the team
    UPDATE teams
    SET penalty_points = calculate_team_penalties(
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.team_id
            ELSE NEW.team_id
        END
    ),
    updated_at = NOW()
    WHERE id = CASE
        WHEN TG_OP = 'DELETE' THEN OLD.team_id
        ELSE NEW.team_id
    END;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create triggers on team_penalties table
DROP TRIGGER IF EXISTS update_team_penalty_total_on_insert ON team_penalties;
CREATE TRIGGER update_team_penalty_total_on_insert
AFTER INSERT ON team_penalties
FOR EACH ROW
EXECUTE FUNCTION update_team_penalty_total();

DROP TRIGGER IF EXISTS update_team_penalty_total_on_update ON team_penalties;
CREATE TRIGGER update_team_penalty_total_on_update
AFTER UPDATE ON team_penalties
FOR EACH ROW
EXECUTE FUNCTION update_team_penalty_total();

DROP TRIGGER IF EXISTS update_team_penalty_total_on_delete ON team_penalties;
CREATE TRIGGER update_team_penalty_total_on_delete
AFTER DELETE ON team_penalties
FOR EACH ROW
EXECUTE FUNCTION update_team_penalty_total();

-- Step 7: Update current_standings view to include net_points
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
    t.points AS points, -- Gross points (from wins/losses)
    t.penalty_points, -- Penalty points
    (t.points - t.penalty_points) AS net_points, -- Net points (after penalties)
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
    (t.points - t.penalty_points) DESC,  -- Primary: Net Points (승점 - 감점)
    t.wins DESC,                         -- Secondary: Wins
    ppg DESC;                            -- Tertiary: Average points scored

-- Step 8: Add RLS policies for team_penalties
ALTER TABLE team_penalties ENABLE ROW LEVEL SECURITY;

-- Admins and staff can view all penalties
DROP POLICY IF EXISTS "Admins and staff can view all penalties" ON team_penalties;
CREATE POLICY "Admins and staff can view all penalties"
    ON team_penalties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Only admins can create penalties
DROP POLICY IF EXISTS "Only admins can create penalties" ON team_penalties;
CREATE POLICY "Only admins can create penalties"
    ON team_penalties FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete penalties
DROP POLICY IF EXISTS "Only admins can delete penalties" ON team_penalties;
CREATE POLICY "Only admins can delete penalties"
    ON team_penalties FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 9: Verify the migration (show teams with penalties)
DO $$
DECLARE
    team_record RECORD;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Penalty System Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Teams table now includes:';
    RAISE NOTICE '- penalty_points column (total penalties)';
    RAISE NOTICE '- Net Points = Points - Penalties';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'current_standings view updated with:';
    RAISE NOTICE '- penalty_points, net_points columns';
    RAISE NOTICE '- Ranking by net_points (not gross points)';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- DROP TRIGGER IF EXISTS update_team_penalty_total_on_insert ON team_penalties;
-- DROP TRIGGER IF EXISTS update_team_penalty_total_on_update ON team_penalties;
-- DROP TRIGGER IF EXISTS update_team_penalty_total_on_delete ON team_penalties;
-- DROP FUNCTION IF EXISTS update_team_penalty_total() CASCADE;
-- DROP FUNCTION IF EXISTS calculate_team_penalties(UUID);
-- ALTER TABLE teams DROP COLUMN IF EXISTS penalty_points;
-- DROP TABLE IF EXISTS team_penalties;
-- Then recreate current_standings view without penalty columns
