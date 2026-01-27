-- Add legacy tables for old site data (kpl_all.sql)

-- ============================================================================
-- 1) OLD PROFILES (legacy players)
-- ============================================================================
CREATE TABLE IF NOT EXISTS old_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    psn_id TEXT NOT NULL,
    psn_id_normalized TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (psn_id_normalized)
);

CREATE INDEX IF NOT EXISTS idx_old_profiles_psn_id
    ON old_profiles(psn_id);
CREATE INDEX IF NOT EXISTS idx_old_profiles_psn_id_normalized
    ON old_profiles(psn_id_normalized);

COMMENT ON TABLE old_profiles IS
    'Legacy player profiles imported from kpl_all.sql (not linked to auth.users)';
COMMENT ON COLUMN old_profiles.psn_id_normalized IS
    'Lowercased PSN ID for case-insensitive matching with current profiles/psn_id_history';

-- ============================================================================
-- 2) OLD MATCH STATS (legacy stats linked to old_profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS old_match_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_row_id TEXT NOT NULL UNIQUE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    old_profile_id UUID NOT NULL REFERENCES old_profiles(id) ON DELETE CASCADE,

    grade TEXT,
    pts INTEGER NOT NULL DEFAULT 0,
    reb INTEGER NOT NULL DEFAULT 0,
    ast INTEGER NOT NULL DEFAULT 0,
    stl INTEGER NOT NULL DEFAULT 0,
    blk INTEGER NOT NULL DEFAULT 0,
    fls INTEGER NOT NULL DEFAULT 0,
    turnovers INTEGER NOT NULL DEFAULT 0,
    fgm INTEGER NOT NULL DEFAULT 0,
    fga INTEGER NOT NULL DEFAULT 0,
    three_pm INTEGER NOT NULL DEFAULT 0,
    three_pa INTEGER NOT NULL DEFAULT 0,
    ftm INTEGER NOT NULL DEFAULT 0,
    fta INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_old_match_stats_match
    ON old_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_old_match_stats_team
    ON old_match_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_old_match_stats_old_profile
    ON old_match_stats(old_profile_id);

COMMENT ON TABLE old_match_stats IS
    'Legacy match stats imported from kpl_all.sql (linked to old_profiles)';
COMMENT ON COLUMN old_match_stats.legacy_row_id IS
    'Stable row identifier for idempotent re-imports (season_code:index)';

-- ============================================================================
-- 3) RLS POLICIES
-- ============================================================================
ALTER TABLE old_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_match_stats ENABLE ROW LEVEL SECURITY;

-- Public read access (legacy data is used for stats display)
DROP POLICY IF EXISTS "Old profiles are viewable by everyone" ON old_profiles;
CREATE POLICY "Old profiles are viewable by everyone"
    ON old_profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Old match stats are viewable by everyone" ON old_match_stats;
CREATE POLICY "Old match stats are viewable by everyone"
    ON old_match_stats FOR SELECT
    USING (true);
