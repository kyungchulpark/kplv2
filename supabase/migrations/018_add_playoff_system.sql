-- ============================================================================
-- Migration 018: Add Playoff System (플레이오프 시스템)
-- ============================================================================
-- Conference-based playoff brackets (Western/Eastern)
-- Best-of-3 (BO3) until Finals, Best-of-5 (BO5) for Championship
-- Admin manual seeding, separate playoff stats
-- ============================================================================

-- Step 1: Create playoff_brackets table (시즌별 플레이오프 브라켓)
CREATE TABLE IF NOT EXISTS playoff_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    bracket_type TEXT NOT NULL CHECK (bracket_type IN ('west', 'east')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- One bracket per conference per season
    UNIQUE(season_id, bracket_type)
);

-- Step 2: Create playoff_series table (시리즈 정보)
CREATE TABLE IF NOT EXISTS playoff_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bracket_id UUID NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 4),
    -- Round 1: 8강, Round 2: 4강, Round 3: Conference Finals, Round 4: Championship
    series_number INTEGER NOT NULL CHECK (series_number BETWEEN 1 AND 4),
    -- Series 1-4 for Round 1, 1-2 for Round 2, 1 for Round 3/4
    team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team1_seed INTEGER, -- Seeding position (1-8)
    team2_seed INTEGER,
    team1_wins INTEGER DEFAULT 0,
    team2_wins INTEGER DEFAULT 0,
    series_format TEXT NOT NULL CHECK (series_format IN ('BO3', 'BO5')),
    -- BO3: First to 2, BO5: First to 3
    winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create playoff_matches table (플레이오프 경기)
CREATE TABLE IF NOT EXISTS playoff_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID NOT NULL REFERENCES playoff_series(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL, -- Game 1, 2, 3, etc.
    home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    home_score INTEGER,
    away_score INTEGER,
    match_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'finished', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create playoff_stats table (플레이오프 선수 통계)
CREATE TABLE IF NOT EXISTS playoff_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES playoff_matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    rebounds INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    fg_made INTEGER DEFAULT 0,
    fg_attempted INTEGER DEFAULT 0,
    three_pm INTEGER DEFAULT 0,
    three_pa INTEGER DEFAULT 0,
    ft_made INTEGER DEFAULT 0,
    ft_attempted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- One stat entry per player per match
    UNIQUE(match_id, player_id)
);

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_playoff_brackets_season
ON playoff_brackets(season_id, bracket_type);

CREATE INDEX IF NOT EXISTS idx_playoff_series_bracket_round
ON playoff_series(bracket_id, round_number, series_number);

CREATE INDEX IF NOT EXISTS idx_playoff_matches_series
ON playoff_matches(series_id, game_number);

CREATE INDEX IF NOT EXISTS idx_playoff_stats_match_player
ON playoff_stats(match_id, player_id);

-- Step 6: Create function to auto-seed playoff bracket
CREATE OR REPLACE FUNCTION seed_playoff_bracket(
    p_season_id UUID,
    p_conference TEXT -- 'West' or 'East'
)
RETURNS UUID AS $$
DECLARE
    v_bracket_id UUID;
    v_bracket_type TEXT;
    v_teams RECORD;
    v_team_seeds UUID[];
    v_series_id UUID;
BEGIN
    -- Convert conference to bracket_type
    v_bracket_type := LOWER(SUBSTRING(p_conference FROM 1 FOR 4));

    -- Create bracket
    INSERT INTO playoff_brackets (season_id, bracket_type)
    VALUES (p_season_id, v_bracket_type)
    ON CONFLICT (season_id, bracket_type) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_bracket_id;

    -- Get top 8 teams by net_points (승점 - 감점)
    SELECT ARRAY_AGG(id ORDER BY (points - COALESCE(penalty_points, 0)) DESC, wins DESC)
    INTO v_team_seeds
    FROM teams
    WHERE season_id = p_season_id
      AND conference = p_conference
      AND COALESCE(is_withdrawn, false) = false
    LIMIT 8;

    -- Create Round 1 series (8강)
    -- Series 1: Seed 1 vs Seed 8
    INSERT INTO playoff_series (bracket_id, round_number, series_number, team1_id, team2_id, team1_seed, team2_seed, series_format)
    VALUES (v_bracket_id, 1, 1, v_team_seeds[1], v_team_seeds[8], 1, 8, 'BO3');

    -- Series 2: Seed 4 vs Seed 5
    INSERT INTO playoff_series (bracket_id, round_number, series_number, team1_id, team2_id, team1_seed, team2_seed, series_format)
    VALUES (v_bracket_id, 1, 2, v_team_seeds[4], v_team_seeds[5], 4, 5, 'BO3');

    -- Series 3: Seed 2 vs Seed 7
    INSERT INTO playoff_series (bracket_id, round_number, series_number, team1_id, team2_id, team1_seed, team2_seed, series_format)
    VALUES (v_bracket_id, 1, 3, v_team_seeds[2], v_team_seeds[7], 2, 7, 'BO3');

    -- Series 4: Seed 3 vs Seed 6
    INSERT INTO playoff_series (bracket_id, round_number, series_number, team1_id, team2_id, team1_seed, team2_seed, series_format)
    VALUES (v_bracket_id, 1, 4, v_team_seeds[3], v_team_seeds[6], 3, 6, 'BO3');

    RAISE NOTICE 'Playoff bracket seeded for % Conference in season %', p_conference, p_season_id;
    RETURN v_bracket_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to update series winner
CREATE OR REPLACE FUNCTION update_playoff_series_winner()
RETURNS TRIGGER AS $$
DECLARE
    v_series RECORD;
    v_max_wins INTEGER;
BEGIN
    -- Only when match is finished
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status <> 'finished') THEN
        -- Get series info
        SELECT * INTO v_series FROM playoff_series WHERE id = NEW.series_id;

        -- Determine max wins needed (2 for BO3, 3 for BO5)
        v_max_wins := CASE
            WHEN v_series.series_format = 'BO3' THEN 2
            WHEN v_series.series_format = 'BO5' THEN 3
            ELSE 2
        END;

        -- Update series wins
        UPDATE playoff_series
        SET
            team1_wins = team1_wins + CASE WHEN NEW.home_team_id = team1_id AND NEW.home_score > NEW.away_score THEN 1
                                          WHEN NEW.away_team_id = team1_id AND NEW.away_score > NEW.home_score THEN 1
                                          ELSE 0 END,
            team2_wins = team2_wins + CASE WHEN NEW.home_team_id = team2_id AND NEW.home_score > NEW.away_score THEN 1
                                          WHEN NEW.away_team_id = team2_id AND NEW.away_score > NEW.home_score THEN 1
                                          ELSE 0 END,
            status = 'ongoing',
            updated_at = NOW()
        WHERE id = NEW.series_id;

        -- Check if series is complete
        UPDATE playoff_series
        SET
            winner_id = CASE
                WHEN team1_wins >= v_max_wins THEN team1_id
                WHEN team2_wins >= v_max_wins THEN team2_id
                ELSE NULL
            END,
            status = CASE
                WHEN team1_wins >= v_max_wins OR team2_wins >= v_max_wins THEN 'completed'
                ELSE 'ongoing'
            END,
            completed_at = CASE
                WHEN team1_wins >= v_max_wins OR team2_wins >= v_max_wins THEN NOW()
                ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = NEW.series_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for playoff match completion
DROP TRIGGER IF EXISTS update_playoff_series_on_match_finish ON playoff_matches;
CREATE TRIGGER update_playoff_series_on_match_finish
AFTER UPDATE ON playoff_matches
FOR EACH ROW
EXECUTE FUNCTION update_playoff_series_winner();

-- Step 9: Add RLS policies
ALTER TABLE playoff_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can view playoff data
DROP POLICY IF EXISTS "Anyone can view playoff brackets" ON playoff_brackets;
CREATE POLICY "Anyone can view playoff brackets"
    ON playoff_brackets FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can view playoff series" ON playoff_series;
CREATE POLICY "Anyone can view playoff series"
    ON playoff_series FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can view playoff matches" ON playoff_matches;
CREATE POLICY "Anyone can view playoff matches"
    ON playoff_matches FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can view playoff stats" ON playoff_stats;
CREATE POLICY "Anyone can view playoff stats"
    ON playoff_stats FOR SELECT
    USING (true);

-- Only admins can create/update playoff data
DROP POLICY IF EXISTS "Only admins can manage playoff brackets" ON playoff_brackets;
CREATE POLICY "Only admins can manage playoff brackets"
    ON playoff_brackets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 10: Verify migration
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Playoff System Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- playoff_brackets (시즌별 브라켓)';
    RAISE NOTICE '- playoff_series (시리즈 정보)';
    RAISE NOTICE '- playoff_matches (플레이오프 경기)';
    RAISE NOTICE '- playoff_stats (선수 통계)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '- seed_playoff_bracket(season_id, conference)';
    RAISE NOTICE '- Auto-update series winner on match finish';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Formats:';
    RAISE NOTICE '- Round 1-2: BO3 (First to 2 wins)';
    RAISE NOTICE '- Round 3-4: BO5 (First to 3 wins)';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- DROP TRIGGER IF EXISTS update_playoff_series_on_match_finish ON playoff_matches;
-- DROP FUNCTION IF EXISTS update_playoff_series_winner() CASCADE;
-- DROP FUNCTION IF EXISTS seed_playoff_bracket(UUID, TEXT);
-- DROP TABLE IF EXISTS playoff_stats;
-- DROP TABLE IF EXISTS playoff_matches;
-- DROP TABLE IF EXISTS playoff_series;
-- DROP TABLE IF EXISTS playoff_brackets;
