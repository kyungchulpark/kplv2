-- ============================================================================
-- Migration: 001_team_requests
-- Description: Create team_requests table for team creation approval workflow
-- Created: 2025-12-05
-- ============================================================================

-- Create team_requests table
CREATE TABLE IF NOT EXISTS team_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    conference TEXT CHECK (conference IN ('West', 'East')),
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(season_id, team_name) -- Prevent duplicate team name requests per season
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_requests_season ON team_requests(season_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_status ON team_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_requests_requester ON team_requests(requester_id);

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_team_requests_updated_at
    BEFORE UPDATE ON team_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can view team requests
DROP POLICY IF EXISTS "Team requests are viewable by everyone" ON team_requests;
CREATE POLICY "Team requests are viewable by everyone"
    ON team_requests
    FOR SELECT
    USING (true);

-- Users can create team requests (as requester)
DROP POLICY IF EXISTS "Users can create team requests" ON team_requests;
CREATE POLICY "Users can create team requests"
    ON team_requests
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Users can update their own pending requests
DROP POLICY IF EXISTS "Users can update own pending requests" ON team_requests;
CREATE POLICY "Users can update own pending requests"
    ON team_requests
    FOR UPDATE
    USING (auth.uid() = requester_id AND status = 'pending');

-- Admins can manage all team requests (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins can manage all team requests" ON team_requests;
CREATE POLICY "Admins can manage all team requests"
    ON team_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Helper Function: Create team from approved request
-- ============================================================================

CREATE OR REPLACE FUNCTION create_team_from_request(request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_team_id UUID;
    request_data RECORD;
BEGIN
    -- Get request data
    SELECT * INTO request_data
    FROM team_requests
    WHERE id = request_id;

    -- Check if request exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Team request not found';
    END IF;

    -- Check if request is approved
    IF request_data.status != 'approved' THEN
        RAISE EXCEPTION 'Request must be approved first';
    END IF;

    -- Create team
    INSERT INTO teams (season_id, name, conference, captain_id, logo_url)
    VALUES (
        request_data.season_id,
        request_data.team_name,
        request_data.conference,
        request_data.requester_id,
        request_data.logo_url
    )
    RETURNING id INTO new_team_id;

    RETURN new_team_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_team_from_request(UUID) TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE team_requests IS 'Stores team creation requests pending admin approval';
COMMENT ON COLUMN team_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN team_requests.reviewed_by IS 'Admin who approved or rejected the request';
COMMENT ON FUNCTION create_team_from_request IS 'Creates a team from an approved team request';
