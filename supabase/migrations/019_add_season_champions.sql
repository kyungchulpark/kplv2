-- ============================================================================
-- Migration 019: Add Season Champions Table (시즌 챔피언 기록)
-- ============================================================================
-- Track championship winners, MVP, and awards for each season
-- Historical records for championship history page
-- ============================================================================

-- Step 1: Create season_champions table
CREATE TABLE IF NOT EXISTS season_champions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE UNIQUE,
    champion_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    runner_up_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    finals_mvp_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    regular_season_mvp_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    finals_series_wins INTEGER DEFAULT 0, -- Champion wins in finals
    finals_series_losses INTEGER DEFAULT 0, -- Champion losses in finals
    championship_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create season_awards table (시즌 개인 수상)
CREATE TABLE IF NOT EXISTS season_awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    award_type TEXT NOT NULL CHECK (award_type IN (
        'mvp',              -- 정규시즌 MVP
        'finals_mvp',       -- 파이널 MVP
        'scoring_leader',   -- 득점왕
        'assist_leader',    -- 어시스트왕
        'rebound_leader',   -- 리바운드왕
        'dpoy',            -- 올해의 수비수
        'all_star'         -- 올스타 선정
    )),
    stat_value NUMERIC(10, 1), -- Award-related stat (e.g., PPG for scoring leader)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- One award per player per season
    UNIQUE(season_id, player_id, award_type)
);

-- Step 3: Add indexes
CREATE INDEX IF NOT EXISTS idx_season_champions_season
ON season_champions(season_id);

CREATE INDEX IF NOT EXISTS idx_season_champions_team
ON season_champions(champion_team_id);

CREATE INDEX IF NOT EXISTS idx_season_awards_season_type
ON season_awards(season_id, award_type);

CREATE INDEX IF NOT EXISTS idx_season_awards_player
ON season_awards(player_id);

-- Step 4: Create function to auto-award scoring/assist/rebound leaders
CREATE OR REPLACE FUNCTION award_season_leaders(p_season_id UUID)
RETURNS VOID AS $$
DECLARE
    v_scoring_leader RECORD;
    v_assist_leader RECORD;
    v_rebound_leader RECORD;
BEGIN
    -- Get scoring leader (득점왕)
    SELECT player_id, ppg INTO v_scoring_leader
    FROM player_season_stats
    WHERE season_id = p_season_id
    ORDER BY ppg DESC
    LIMIT 1;

    IF FOUND THEN
        INSERT INTO season_awards (season_id, player_id, award_type, stat_value)
        VALUES (p_season_id, v_scoring_leader.player_id, 'scoring_leader', v_scoring_leader.ppg)
        ON CONFLICT (season_id, player_id, award_type) DO UPDATE
        SET stat_value = EXCLUDED.stat_value, updated_at = NOW();
    END IF;

    -- Get assist leader (어시스트왕)
    SELECT player_id, apg INTO v_assist_leader
    FROM player_season_stats
    WHERE season_id = p_season_id
    ORDER BY apg DESC
    LIMIT 1;

    IF FOUND THEN
        INSERT INTO season_awards (season_id, player_id, award_type, stat_value)
        VALUES (p_season_id, v_assist_leader.player_id, 'assist_leader', v_assist_leader.apg)
        ON CONFLICT (season_id, player_id, award_type) DO UPDATE
        SET stat_value = EXCLUDED.stat_value, updated_at = NOW();
    END IF;

    -- Get rebound leader (리바운드왕)
    SELECT player_id, rpg INTO v_rebound_leader
    FROM player_season_stats
    WHERE season_id = p_season_id
    ORDER BY rpg DESC
    LIMIT 1;

    IF FOUND THEN
        INSERT INTO season_awards (season_id, player_id, award_type, stat_value)
        VALUES (p_season_id, v_rebound_leader.player_id, 'rebound_leader', v_rebound_leader.rpg)
        ON CONFLICT (season_id, player_id, award_type) DO UPDATE
        SET stat_value = EXCLUDED.stat_value, updated_at = NOW();
    END IF;

    RAISE NOTICE 'Season leaders awarded for season %', p_season_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to record championship
CREATE OR REPLACE FUNCTION record_championship(
    p_season_id UUID,
    p_champion_team_id UUID,
    p_runner_up_team_id UUID,
    p_finals_mvp_id UUID DEFAULT NULL,
    p_series_wins INTEGER DEFAULT 3,
    p_series_losses INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO season_champions (
        season_id,
        champion_team_id,
        runner_up_team_id,
        finals_mvp_id,
        finals_series_wins,
        finals_series_losses,
        championship_date
    )
    VALUES (
        p_season_id,
        p_champion_team_id,
        p_runner_up_team_id,
        p_finals_mvp_id,
        p_series_wins,
        p_series_losses,
        NOW()
    )
    ON CONFLICT (season_id) DO UPDATE
    SET
        champion_team_id = EXCLUDED.champion_team_id,
        runner_up_team_id = EXCLUDED.runner_up_team_id,
        finals_mvp_id = EXCLUDED.finals_mvp_id,
        finals_series_wins = EXCLUDED.finals_series_wins,
        finals_series_losses = EXCLUDED.finals_series_losses,
        updated_at = NOW();

    -- Also award Finals MVP
    IF p_finals_mvp_id IS NOT NULL THEN
        INSERT INTO season_awards (season_id, player_id, award_type)
        VALUES (p_season_id, p_finals_mvp_id, 'finals_mvp')
        ON CONFLICT (season_id, player_id, award_type) DO NOTHING;
    END IF;

    RAISE NOTICE 'Championship recorded for season %', p_season_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create view for championship history
DROP VIEW IF EXISTS championship_history;

CREATE OR REPLACE VIEW championship_history AS
SELECT
    sc.id,
    s.name AS season_name,
    s.start_date,
    s.end_date,
    ct.name AS champion_team_name,
    ct.logo_url AS champion_logo,
    rt.name AS runner_up_team_name,
    rt.logo_url AS runner_up_logo,
    fmvp.psn_id AS finals_mvp_name,
    rmvp.psn_id AS regular_mvp_name,
    sc.finals_series_wins,
    sc.finals_series_losses,
    sc.championship_date
FROM season_champions sc
JOIN seasons s ON sc.season_id = s.id
JOIN teams ct ON sc.champion_team_id = ct.id
LEFT JOIN teams rt ON sc.runner_up_team_id = rt.id
LEFT JOIN profiles fmvp ON sc.finals_mvp_id = fmvp.id
LEFT JOIN profiles rmvp ON sc.regular_season_mvp_id = rmvp.id
ORDER BY s.start_date DESC;

-- Step 7: Add RLS policies
ALTER TABLE season_champions ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_awards ENABLE ROW LEVEL SECURITY;

-- Everyone can view championship records
DROP POLICY IF EXISTS "Anyone can view season champions" ON season_champions;
CREATE POLICY "Anyone can view season champions"
    ON season_champions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can view season awards" ON season_awards;
CREATE POLICY "Anyone can view season awards"
    ON season_awards FOR SELECT
    USING (true);

-- Only admins can record championships
DROP POLICY IF EXISTS "Only admins can manage champions" ON season_champions;
CREATE POLICY "Only admins can manage champions"
    ON season_champions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can manage awards" ON season_awards;
CREATE POLICY "Only admins can manage awards"
    ON season_awards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 8: Verify migration
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Season Champions Migration Completed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- season_champions (챔피언 기록)';
    RAISE NOTICE '- season_awards (개인 수상)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '- championship_history (챔피언십 역사)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '- award_season_leaders(season_id)';
    RAISE NOTICE '- record_championship(season_id, champion, runner_up, mvp, wins, losses)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Award types:';
    RAISE NOTICE '- mvp, finals_mvp, scoring_leader,';
    RAISE NOTICE '- assist_leader, rebound_leader, dpoy, all_star';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- DROP VIEW IF EXISTS championship_history;
-- DROP FUNCTION IF EXISTS record_championship(UUID, UUID, UUID, UUID, INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS award_season_leaders(UUID);
-- DROP TABLE IF EXISTS season_awards;
-- DROP TABLE IF EXISTS season_champions;
