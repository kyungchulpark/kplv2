-- Make season_id nullable in team_requests table
-- This allows teams to be created without an active season
-- Teams will be in "waiting to join league" state until admin assigns a season

ALTER TABLE team_requests
ALTER COLUMN season_id DROP NOT NULL;

-- Add comment to explain nullable season_id
COMMENT ON COLUMN team_requests.season_id IS 'Season ID - can be null for teams created before season assignment';
