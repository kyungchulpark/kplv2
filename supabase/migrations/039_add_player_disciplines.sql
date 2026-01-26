-- Add player discipline system for tracking suspensions
-- Automatically decrements games_remaining when player participates in finished matches

CREATE TABLE player_disciplines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    games_suspended INTEGER NOT NULL CHECK (games_suspended > 0),
    games_remaining INTEGER NOT NULL CHECK (games_remaining >= 0),
    reason TEXT NOT NULL,
    applied_by UUID REFERENCES profiles(id),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (games_remaining <= games_suspended)
);

-- Indexes for performance
CREATE INDEX idx_player_disciplines_player ON player_disciplines(player_id);
CREATE INDEX idx_player_disciplines_season ON player_disciplines(season_id);
CREATE INDEX idx_player_disciplines_active ON player_disciplines(player_id, is_active)
    WHERE is_active = true;
CREATE INDEX idx_player_disciplines_player_season ON player_disciplines(player_id, season_id, is_active);

-- Function to automatically decrement suspension games when a match finishes
CREATE OR REPLACE FUNCTION decrement_player_suspensions()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when match changes to finished status
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
        -- Get all players who participated in this match
        WITH match_players AS (
            SELECT DISTINCT player_id FROM match_stats WHERE match_id = NEW.id
        )
        -- Decrement games_remaining for suspended players who played
        UPDATE player_disciplines pd
        SET
            games_remaining = games_remaining - 1,
            is_active = CASE WHEN games_remaining - 1 = 0 THEN false ELSE true END,
            completed_at = CASE WHEN games_remaining - 1 = 0 THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE pd.player_id IN (SELECT player_id FROM match_players)
          AND pd.season_id = NEW.season_id
          AND pd.is_active = true
          AND pd.games_remaining > 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically decrement suspensions when match finishes
CREATE TRIGGER trigger_decrement_suspensions_on_match_finish
AFTER UPDATE OF status ON matches
FOR EACH ROW
EXECUTE FUNCTION decrement_player_suspensions();

-- RLS policies
ALTER TABLE player_disciplines ENABLE ROW LEVEL SECURITY;

-- Everyone can view disciplines
CREATE POLICY "Disciplines viewable by all"
    ON player_disciplines FOR SELECT
    USING (true);

-- Only admins and staff can manage disciplines
CREATE POLICY "Admins can manage disciplines"
    ON player_disciplines FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_disciplines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_player_disciplines_updated_at
BEFORE UPDATE ON player_disciplines
FOR EACH ROW
EXECUTE FUNCTION update_player_disciplines_updated_at();

-- Function to prevent creating suspensions with games_remaining > games_suspended
CREATE OR REPLACE FUNCTION validate_discipline_games()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.games_remaining > NEW.games_suspended THEN
        RAISE EXCEPTION 'games_remaining cannot be greater than games_suspended';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate discipline games
CREATE TRIGGER trigger_validate_discipline_games
BEFORE INSERT OR UPDATE ON player_disciplines
FOR EACH ROW
EXECUTE FUNCTION validate_discipline_games();

-- Comments for documentation
COMMENT ON TABLE player_disciplines IS 'Tracks player suspensions and automatically decrements remaining games';
COMMENT ON COLUMN player_disciplines.games_suspended IS 'Total number of games the player is suspended for';
COMMENT ON COLUMN player_disciplines.games_remaining IS 'Number of suspension games remaining';
COMMENT ON COLUMN player_disciplines.reason IS 'Reason for the suspension';
COMMENT ON COLUMN player_disciplines.applied_by IS 'Admin/staff who applied the suspension';
COMMENT ON COLUMN player_disciplines.completed_at IS 'When the suspension was completed (games_remaining reached 0)';
COMMENT ON COLUMN player_disciplines.is_active IS 'Whether this suspension is currently active';
