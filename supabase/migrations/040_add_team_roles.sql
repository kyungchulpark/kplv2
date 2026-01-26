-- Add team roles system to support Captain + Vice Captain
-- This allows flexible team management with multiple managers per team

CREATE TABLE team_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('captain', 'vice_captain', 'coach', 'manager')),
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, player_id, role, season_id)
);

-- Indexes for performance
CREATE INDEX idx_team_roles_team ON team_roles(team_id, is_active);
CREATE INDEX idx_team_roles_player ON team_roles(player_id);
CREATE INDEX idx_team_roles_season ON team_roles(season_id);
CREATE INDEX idx_team_roles_active_captains ON team_roles(team_id, role, is_active)
    WHERE role = 'captain' AND is_active = true;

-- Migrate existing captains from teams table
INSERT INTO team_roles (team_id, player_id, season_id, role, granted_at, is_active)
SELECT t.id, t.captain_id, t.season_id, 'captain', t.created_at, true
FROM teams t WHERE t.captain_id IS NOT NULL
ON CONFLICT (team_id, player_id, role, season_id) DO NOTHING;

-- RLS policies
ALTER TABLE team_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view team roles
CREATE POLICY "Team roles viewable by all"
    ON team_roles FOR SELECT
    USING (true);

-- Admins and staff can manage all team roles
CREATE POLICY "Admins can manage all team roles"
    ON team_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Captains can manage vice captains for their own team
CREATE POLICY "Captains can manage vice captains"
    ON team_roles FOR ALL
    USING (
        -- User must be an active captain of the team
        EXISTS (
            SELECT 1 FROM team_roles tr
            WHERE tr.team_id = team_roles.team_id
              AND tr.player_id = auth.uid()
              AND tr.role = 'captain'
              AND tr.is_active = true
        )
        -- And the action is on a vice captain role
        AND team_roles.role = 'vice_captain'
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_team_roles_updated_at
BEFORE UPDATE ON team_roles
FOR EACH ROW
EXECUTE FUNCTION update_team_roles_updated_at();

-- Function to ensure only one active captain per team
CREATE OR REPLACE FUNCTION enforce_single_captain()
RETURNS TRIGGER AS $$
BEGIN
    -- If trying to add a new active captain
    IF NEW.role = 'captain' AND NEW.is_active = true THEN
        -- Check if another active captain exists for this team
        IF EXISTS (
            SELECT 1 FROM team_roles
            WHERE team_id = NEW.team_id
              AND season_id = NEW.season_id
              AND role = 'captain'
              AND is_active = true
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'A team can only have one active captain. Please revoke the existing captain first.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single captain rule
CREATE TRIGGER trigger_enforce_single_captain
BEFORE INSERT OR UPDATE ON team_roles
FOR EACH ROW
EXECUTE FUNCTION enforce_single_captain();

-- Comments for documentation
COMMENT ON TABLE team_roles IS 'Manages team leadership roles (captain, vice captain, etc.)';
COMMENT ON COLUMN team_roles.role IS 'Role type: captain (1 per team), vice_captain (multiple allowed), coach, manager';
COMMENT ON COLUMN team_roles.granted_by IS 'User who granted this role (admin or captain)';
COMMENT ON COLUMN team_roles.revoked_at IS 'When the role was revoked (NULL if still active)';
COMMENT ON COLUMN team_roles.is_active IS 'Whether this role is currently active';
