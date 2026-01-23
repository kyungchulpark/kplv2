-- Add is_disbanded column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS is_disbanded BOOLEAN DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_teams_disbanded ON teams(is_disbanded);

-- First, set all existing teams to NOT disbanded (default)
UPDATE teams
SET is_disbanded = false
WHERE is_disbanded IS NULL;

-- Then mark legacy teams (teams not in current season AND not active) as disbanded
-- This helps clean up the team management interface
UPDATE teams
SET is_disbanded = true
WHERE season_id != (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
  AND (is_active = false OR is_active IS NULL);
