-- ============================================================================
-- Migration 016: Add Forfeit System (몰수 시스템)
-- ============================================================================
-- Admin can declare a match as forfeit without entering player stats
-- Forfeit Win: 2 points, no stats counted
-- Forfeit Loss: 0 points, no stats counted
-- Display "몰수" badge on schedule
-- ============================================================================

-- Step 1: Add forfeit columns to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS is_forfeit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS forfeit_winner_id UUID REFERENCES teams(id),
ADD COLUMN IF NOT EXISTS forfeit_reason TEXT;

-- Step 2: Add index for forfeit matches lookup
CREATE INDEX IF NOT EXISTS idx_matches_forfeit
ON matches(is_forfeit, forfeit_winner_id);

-- Step 3: Add constraint to ensure forfeit_winner_id is valid
ALTER TABLE matches
ADD CONSTRAINT forfeit_winner_must_be_home_or_away
CHECK (
    forfeit_winner_id IS NULL OR
    forfeit_winner_id = home_team_id OR
    forfeit_winner_id = away_team_id
);

-- Step 4: Update standings trigger to handle forfeits
DROP FUNCTION IF EXISTS update_team_standings() CASCADE;

CREATE OR REPLACE FUNCTION update_team_standings()
RETURNS TRIGGER AS $$
BEGIN
    -- Only when moving into finished status
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status <> 'finished') THEN

        -- Check if it's a forfeit match
        IF NEW.is_forfeit = true AND NEW.forfeit_winner_id IS NOT NULL THEN
            -- FORFEIT MATCH LOGIC
            -- Winner gets 2 points, 1 win, no stats
            -- Loser gets 0 points, 1 loss, no stats

            -- Home team
            UPDATE teams
            SET
                wins = wins + CASE WHEN NEW.forfeit_winner_id = NEW.home_team_id THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.forfeit_winner_id <> NEW.home_team_id THEN 1 ELSE 0 END,
                points = points + CASE WHEN NEW.forfeit_winner_id = NEW.home_team_id THEN 2 ELSE 0 END,
                -- NO points_for/points_against update for forfeits
                updated_at = NOW()
            WHERE id = NEW.home_team_id;

            -- Away team
            UPDATE teams
            SET
                wins = wins + CASE WHEN NEW.forfeit_winner_id = NEW.away_team_id THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.forfeit_winner_id <> NEW.away_team_id THEN 1 ELSE 0 END,
                points = points + CASE WHEN NEW.forfeit_winner_id = NEW.away_team_id THEN 2 ELSE 0 END,
                -- NO points_for/points_against update for forfeits
                updated_at = NOW()
            WHERE id = NEW.away_team_id;

        ELSE
            -- NORMAL MATCH LOGIC (non-forfeit)
            -- Winner gets 2 points, loser gets 1 point, stats counted

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

-- Step 6: Create function to declare forfeit (admin use)
CREATE OR REPLACE FUNCTION declare_match_forfeit(
    p_match_id UUID,
    p_winner_id UUID,
    p_reason TEXT DEFAULT '불참'
)
RETURNS VOID AS $$
BEGIN
    -- Validate that winner is home or away team
    IF NOT EXISTS (
        SELECT 1 FROM matches
        WHERE id = p_match_id
        AND (home_team_id = p_winner_id OR away_team_id = p_winner_id)
    ) THEN
        RAISE EXCEPTION 'Winner must be home or away team';
    END IF;

    -- Update match as forfeit and finished
    UPDATE matches
    SET
        is_forfeit = true,
        forfeit_winner_id = p_winner_id,
        forfeit_reason = p_reason,
        status = 'finished',
        home_score = CASE WHEN home_team_id = p_winner_id THEN 2 ELSE 0 END, -- Symbolic scores
        away_score = CASE WHEN away_team_id = p_winner_id THEN 2 ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_match_id;

    RAISE NOTICE 'Match % declared forfeit. Winner: %', p_match_id, p_winner_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to undo forfeit (admin use)
CREATE OR REPLACE FUNCTION undo_match_forfeit(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    match_record RECORD;
BEGIN
    -- Get current match state
    SELECT * INTO match_record FROM matches WHERE id = p_match_id;

    IF NOT match_record.is_forfeit THEN
        RAISE EXCEPTION 'Match % is not a forfeit', p_match_id;
    END IF;

    -- Reverse the standings changes
    IF match_record.forfeit_winner_id = match_record.home_team_id THEN
        -- Home team won by forfeit, reverse it
        UPDATE teams SET wins = wins - 1, points = points - 2, updated_at = NOW()
        WHERE id = match_record.home_team_id;

        UPDATE teams SET losses = losses - 1, updated_at = NOW()
        WHERE id = match_record.away_team_id;
    ELSE
        -- Away team won by forfeit, reverse it
        UPDATE teams SET wins = wins - 1, points = points - 2, updated_at = NOW()
        WHERE id = match_record.away_team_id;

        UPDATE teams SET losses = losses - 1, updated_at = NOW()
        WHERE id = match_record.home_team_id;
    END IF;

    -- Reset match to scheduled
    UPDATE matches
    SET
        is_forfeit = false,
        forfeit_winner_id = NULL,
        forfeit_reason = NULL,
        status = 'scheduled',
        home_score = NULL,
        away_score = NULL,
        updated_at = NOW()
    WHERE id = p_match_id;

    RAISE NOTICE 'Forfeit undone for match %', p_match_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Verify the migration
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Forfeit System Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'matches table now includes:';
    RAISE NOTICE '- is_forfeit (BOOLEAN)';
    RAISE NOTICE '- forfeit_winner_id (UUID)';
    RAISE NOTICE '- forfeit_reason (TEXT)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Trigger updated to handle forfeits:';
    RAISE NOTICE '- Forfeit Win: 2 points, 1 win, no stats';
    RAISE NOTICE '- Forfeit Loss: 0 points, 1 loss, no stats';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Admin functions available:';
    RAISE NOTICE '- declare_match_forfeit(match_id, winner_id, reason)';
    RAISE NOTICE '- undo_match_forfeit(match_id)';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- DROP FUNCTION IF EXISTS declare_match_forfeit(UUID, UUID, TEXT);
-- DROP FUNCTION IF EXISTS undo_match_forfeit(UUID);
-- ALTER TABLE matches DROP CONSTRAINT IF EXISTS forfeit_winner_must_be_home_or_away;
-- DROP INDEX IF EXISTS idx_matches_forfeit;
-- ALTER TABLE matches DROP COLUMN IF EXISTS is_forfeit;
-- ALTER TABLE matches DROP COLUMN IF EXISTS forfeit_winner_id;
-- ALTER TABLE matches DROP COLUMN IF EXISTS forfeit_reason;
-- Then recreate update_team_standings() without forfeit logic
