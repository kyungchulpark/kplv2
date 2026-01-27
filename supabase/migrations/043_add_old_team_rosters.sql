-- Add legacy team rosters from leager tables in kpl_all.sql

-- ============================================================================
-- 1) OLD TEAM ROSTERS (legacy roster snapshots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS old_team_rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_row_id TEXT NOT NULL UNIQUE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    old_profile_id UUID NOT NULL REFERENCES old_profiles(id) ON DELETE CASCADE,
    position TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (season_id, team_id, old_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_old_rosters_season
    ON old_team_rosters(season_id);
CREATE INDEX IF NOT EXISTS idx_old_rosters_team
    ON old_team_rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_old_rosters_old_profile
    ON old_team_rosters(old_profile_id);

COMMENT ON TABLE old_team_rosters IS
    'Legacy team rosters imported from *_leager tables in kpl_all.sql';

-- ============================================================================
-- 2) RLS POLICIES
-- ============================================================================
ALTER TABLE old_team_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Old team rosters are viewable by everyone" ON old_team_rosters;
CREATE POLICY "Old team rosters are viewable by everyone"
    ON old_team_rosters FOR SELECT
    USING (true);
