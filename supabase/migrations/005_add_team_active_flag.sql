-- ============================================
-- Add is_active flag to teams table
-- ============================================
-- This allows marking which teams are actively participating in the league
-- Only active teams will be included in conference draw and standings

-- Add is_active column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN teams.is_active IS
'Indicates if the team is actively participating in the current season. Only active teams are included in conference draw and standings.';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(season_id, is_active) WHERE is_active = true;

-- Update existing teams to be active by default
UPDATE teams SET is_active = true WHERE is_active IS NULL;
