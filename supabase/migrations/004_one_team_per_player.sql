-- ============================================
-- One Team Per Player Constraint
-- ============================================
-- Ensures a player can only be in one team per season
-- This prevents players from being in multiple teams simultaneously

-- Create unique index to enforce one active roster entry per player per season
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_team_per_player_per_season
ON team_rosters (player_id, season_id, is_active)
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON INDEX idx_one_team_per_player_per_season IS
'Ensures a player can only be in one active team roster per season';

-- Additional check: Create a function to validate team membership on team creation
-- This checks if the captain is already in another team when creating a team request
CREATE OR REPLACE FUNCTION check_captain_team_membership()
RETURNS TRIGGER AS $$
DECLARE
  existing_team_count INTEGER;
BEGIN
  -- Check if requester is already a captain of another team in this season
  SELECT COUNT(*) INTO existing_team_count
  FROM teams
  WHERE captain_id = NEW.requester_id
    AND season_id = NEW.season_id;

  IF existing_team_count > 0 THEN
    RAISE EXCEPTION 'User is already a captain of a team in this season';
  END IF;

  -- Check if requester is already in a team roster for this season
  SELECT COUNT(*) INTO existing_team_count
  FROM team_rosters
  WHERE player_id = NEW.requester_id
    AND season_id = NEW.season_id
    AND is_active = true;

  IF existing_team_count > 0 THEN
    RAISE EXCEPTION 'User is already a member of a team in this season';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team requests
DROP TRIGGER IF EXISTS before_team_request_insert ON team_requests;
CREATE TRIGGER before_team_request_insert
  BEFORE INSERT ON team_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_captain_team_membership();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_captain_team_membership() TO authenticated;
