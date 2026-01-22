-- Make teams.season_id nullable to support teams without season assignment
-- This allows admins to approve team requests before assigning them to a season

ALTER TABLE teams
ALTER COLUMN season_id DROP NOT NULL;

COMMENT ON COLUMN teams.season_id IS 'Season ID - can be null for teams waiting for season assignment';
