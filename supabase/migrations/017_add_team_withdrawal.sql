-- ============================================================================
-- Migration 017: Add Team Withdrawal System (팀 탈퇴 시스템)
-- ============================================================================
-- Admin can mark teams as withdrawn from the season
-- Withdrawn teams show (탈퇴) badge and strikethrough in standings
-- All future matches are cancelled automatically
-- Past match results remain unchanged
-- ============================================================================

-- Step 1: Create team_withdrawals table
CREATE TABLE IF NOT EXISTS team_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    withdrawn_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    withdrawn_by UUID REFERENCES profiles(id), -- Admin who processed withdrawal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraint: one withdrawal per team per season
    UNIQUE(team_id, season_id)
);

-- Step 2: Add index for withdrawal lookup
CREATE INDEX IF NOT EXISTS idx_team_withdrawals_team_season
ON team_withdrawals(team_id, season_id);

CREATE INDEX IF NOT EXISTS idx_team_withdrawals_withdrawn_at
ON team_withdrawals(withdrawn_at DESC);

-- Step 3: Add is_withdrawn flag to teams table for quick lookup
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT false;

-- Step 4: Create trigger to update teams.is_withdrawn when withdrawal is added
CREATE OR REPLACE FUNCTION update_team_withdrawal_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Mark team as withdrawn
        UPDATE teams
        SET is_withdrawn = true, updated_at = NOW()
        WHERE id = NEW.team_id;

        -- Cancel all future matches for this team
        UPDATE matches
        SET status = 'cancelled', updated_at = NOW()
        WHERE (home_team_id = NEW.team_id OR away_team_id = NEW.team_id)
        AND status = 'scheduled'
        AND match_date > NEW.withdrawn_at;

        RAISE NOTICE 'Team % marked as withdrawn. Future matches cancelled.', NEW.team_id;

    ELSIF TG_OP = 'DELETE' THEN
        -- Mark team as active again
        UPDATE teams
        SET is_withdrawn = false, updated_at = NOW()
        WHERE id = OLD.team_id;

        RAISE NOTICE 'Team % withdrawal reversed. Matches remain cancelled.', OLD.team_id;
    END IF;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers on team_withdrawals
DROP TRIGGER IF EXISTS update_team_withdrawal_status_on_insert ON team_withdrawals;
CREATE TRIGGER update_team_withdrawal_status_on_insert
AFTER INSERT ON team_withdrawals
FOR EACH ROW
EXECUTE FUNCTION update_team_withdrawal_status();

DROP TRIGGER IF EXISTS update_team_withdrawal_status_on_delete ON team_withdrawals;
CREATE TRIGGER update_team_withdrawal_status_on_delete
AFTER DELETE ON team_withdrawals
FOR EACH ROW
EXECUTE FUNCTION update_team_withdrawal_status();

-- Step 6: Create function to withdraw a team (admin use)
CREATE OR REPLACE FUNCTION withdraw_team(
    p_team_id UUID,
    p_season_id UUID,
    p_reason TEXT DEFAULT '팀 사정으로 인한 탈퇴'
)
RETURNS VOID AS $$
BEGIN
    -- Check if team exists in season
    IF NOT EXISTS (
        SELECT 1 FROM teams
        WHERE id = p_team_id AND season_id = p_season_id
    ) THEN
        RAISE EXCEPTION 'Team % not found in season %', p_team_id, p_season_id;
    END IF;

    -- Check if already withdrawn
    IF EXISTS (
        SELECT 1 FROM team_withdrawals
        WHERE team_id = p_team_id AND season_id = p_season_id
    ) THEN
        RAISE EXCEPTION 'Team % already withdrawn from season %', p_team_id, p_season_id;
    END IF;

    -- Insert withdrawal record
    INSERT INTO team_withdrawals (team_id, season_id, reason, withdrawn_by)
    VALUES (p_team_id, p_season_id, p_reason, auth.uid());

    RAISE NOTICE 'Team % withdrawn from season %', p_team_id, p_season_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to undo team withdrawal (admin use)
CREATE OR REPLACE FUNCTION undo_team_withdrawal(
    p_team_id UUID,
    p_season_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Check if team is withdrawn
    IF NOT EXISTS (
        SELECT 1 FROM team_withdrawals
        WHERE team_id = p_team_id AND season_id = p_season_id
    ) THEN
        RAISE EXCEPTION 'Team % is not withdrawn from season %', p_team_id, p_season_id;
    END IF;

    -- Delete withdrawal record (trigger will update teams.is_withdrawn)
    DELETE FROM team_withdrawals
    WHERE team_id = p_team_id AND season_id = p_season_id;

    RAISE NOTICE 'Withdrawal undone for team % in season %. Cancelled matches remain cancelled.', p_team_id, p_season_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Update current_standings view to include withdrawal status
-- Note: This view will be recreated again in Migration 015 (penalty system) to add penalty_points
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
    t.points AS points, -- Points from wins/losses
    t.is_withdrawn, -- Withdrawal status
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
    t.is_withdrawn ASC,  -- Active teams first, withdrawn teams last
    t.points DESC,        -- Primary: Points
    t.wins DESC,          -- Secondary: Wins
    ppg DESC;             -- Tertiary: Average points scored

-- Step 9: Add RLS policies for team_withdrawals
ALTER TABLE team_withdrawals ENABLE ROW LEVEL SECURITY;

-- Admins and staff can view all withdrawals
DROP POLICY IF EXISTS "Admins and staff can view all withdrawals" ON team_withdrawals;
CREATE POLICY "Admins and staff can view all withdrawals"
    ON team_withdrawals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Only admins can create withdrawals
DROP POLICY IF EXISTS "Only admins can create withdrawals" ON team_withdrawals;
CREATE POLICY "Only admins can create withdrawals"
    ON team_withdrawals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete withdrawals (undo)
DROP POLICY IF EXISTS "Only admins can delete withdrawals" ON team_withdrawals;
CREATE POLICY "Only admins can delete withdrawals"
    ON team_withdrawals FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 10: Verify the migration
DO $$
DECLARE
    total_teams INTEGER;
    withdrawn_teams INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_teams FROM teams;
    SELECT COUNT(*) INTO withdrawn_teams FROM teams WHERE is_withdrawn = true;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Team Withdrawal System Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'teams table now includes:';
    RAISE NOTICE '- is_withdrawn (BOOLEAN)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'team_withdrawals table created:';
    RAISE NOTICE '- Tracks withdrawal history';
    RAISE NOTICE '- One withdrawal per team per season';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Trigger auto-cancels future matches';
    RAISE NOTICE 'current_standings view updated (withdrawn teams last)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total teams: %', total_teams;
    RAISE NOTICE 'Withdrawn teams: %', withdrawn_teams;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Admin functions available:';
    RAISE NOTICE '- withdraw_team(team_id, season_id, reason)';
    RAISE NOTICE '- undo_team_withdrawal(team_id, season_id)';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- DROP FUNCTION IF EXISTS withdraw_team(UUID, UUID, TEXT);
-- DROP FUNCTION IF EXISTS undo_team_withdrawal(UUID, UUID);
-- DROP TRIGGER IF EXISTS update_team_withdrawal_status_on_insert ON team_withdrawals;
-- DROP TRIGGER IF EXISTS update_team_withdrawal_status_on_delete ON team_withdrawals;
-- DROP FUNCTION IF EXISTS update_team_withdrawal_status() CASCADE;
-- DROP INDEX IF EXISTS idx_team_withdrawals_team_season;
-- DROP INDEX IF EXISTS idx_team_withdrawals_withdrawn_at;
-- ALTER TABLE teams DROP COLUMN IF EXISTS is_withdrawn;
-- DROP TABLE IF EXISTS team_withdrawals;
-- Then recreate current_standings view without is_withdrawn
