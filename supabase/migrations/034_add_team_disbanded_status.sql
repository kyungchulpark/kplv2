-- Add is_disbanded column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS is_disbanded BOOLEAN DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_teams_disbanded ON teams(is_disbanded);

-- Update existing legacy teams (teams not in current season) to be disbanded by default
-- This helps clean up the team management interface
UPDATE teams
SET is_disbanded = true
WHERE season_id != (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
  AND is_active = false;
