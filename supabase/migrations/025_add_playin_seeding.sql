-- ============================================================================
-- Migration 025: Add Play-In Tournament Seeding Function
-- ============================================================================
-- NBA-style play-in: 7/8 winner → 7th seed, 9/10 winner vs 7/8 loser → 8th seed
-- ============================================================================

-- Function to create play-in tournament bracket
CREATE OR REPLACE FUNCTION create_playin_bracket(
    p_season_id UUID,
    p_conference TEXT,
    p_team7_id UUID,
    p_team8_id UUID,
    p_team9_id UUID,
    p_team10_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_bracket_id UUID;
    v_series1_id UUID;  -- 7 vs 8
    v_series2_id UUID;  -- 9 vs 10
    v_series3_id UUID;  -- Loser of series1 vs Winner of series2
BEGIN
    -- Get or create bracket for this conference
    SELECT id INTO v_bracket_id
    FROM playoff_brackets
    WHERE season_id = p_season_id AND bracket_type = p_conference;

    IF v_bracket_id IS NULL THEN
        INSERT INTO playoff_brackets (season_id, bracket_type, is_active)
        VALUES (p_season_id, p_conference, true)
        RETURNING id INTO v_bracket_id;
    END IF;

    -- Delete existing play-in series for this bracket
    DELETE FROM playoff_series WHERE bracket_id = v_bracket_id AND round_number = 0;

    -- Create Series 1: 7 vs 8 (BO1)
    -- Winner gets 7th seed
    INSERT INTO playoff_series (
        bracket_id,
        round_number,
        series_number,
        series_format,
        team1_id,
        team1_seed,
        team2_id,
        team2_seed,
        status
    ) VALUES (
        v_bracket_id,
        0,  -- Play-in round
        1,  -- First series
        'BO1',
        p_team7_id,
        7,
        p_team8_id,
        8,
        'pending'
    ) RETURNING id INTO v_series1_id;

    -- Create Series 2: 9 vs 10 (BO1)
    -- Winner advances to Series 3
    INSERT INTO playoff_series (
        bracket_id,
        round_number,
        series_number,
        series_format,
        team1_id,
        team1_seed,
        team2_id,
        team2_seed,
        status
    ) VALUES (
        v_bracket_id,
        0,
        2,
        'BO1',
        p_team9_id,
        9,
        p_team10_id,
        10,
        'pending'
    ) RETURNING id INTO v_series2_id;

    -- Create Series 3: Loser of 7/8 vs Winner of 9/10 (BO1)
    -- Winner gets 8th seed
    INSERT INTO playoff_series (
        bracket_id,
        round_number,
        series_number,
        series_format,
        team1_id,  -- Will be set after series 1 completes
        team1_seed,
        team2_id,  -- Will be set after series 2 completes
        team2_seed,
        status
    ) VALUES (
        v_bracket_id,
        0,
        3,
        'BO1',
        NULL,
        NULL,
        NULL,
        NULL,
        'pending'
    ) RETURNING id INTO v_series3_id;

    RAISE NOTICE 'Play-in bracket created for % conference: Series 1 (%, %), Series 2 (%, %)',
        p_conference, v_series1_id, v_series2_id, v_series3_id;

    RETURN v_bracket_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate Series 3 when Series 1 and 2 complete
CREATE OR REPLACE FUNCTION update_playin_series3()
RETURNS TRIGGER AS $$
DECLARE
    v_series1 RECORD;
    v_series2 RECORD;
    v_series3_id UUID;
    v_loser_of_series1 UUID;
    v_winner_of_series2 UUID;
BEGIN
    -- Only for play-in round (round 0)
    IF NEW.round_number = 0 AND NEW.status = 'completed' THEN

        -- Get Series 1 (7 vs 8)
        SELECT * INTO v_series1
        FROM playoff_series
        WHERE bracket_id = NEW.bracket_id
          AND round_number = 0
          AND series_number = 1;

        -- Get Series 2 (9 vs 10)
        SELECT * INTO v_series2
        FROM playoff_series
        WHERE bracket_id = NEW.bracket_id
          AND round_number = 0
          AND series_number = 2;

        -- If both series are complete, populate Series 3
        IF v_series1.status = 'completed' AND v_series2.status = 'completed' THEN

            -- Find loser of Series 1
            IF v_series1.winner_id = v_series1.team1_id THEN
                v_loser_of_series1 := v_series1.team2_id;
            ELSE
                v_loser_of_series1 := v_series1.team1_id;
            END IF;

            -- Winner of Series 2
            v_winner_of_series2 := v_series2.winner_id;

            -- Update Series 3 with the teams
            UPDATE playoff_series
            SET
                team1_id = v_loser_of_series1,
                team1_seed = 8,  -- Loser from 7/8
                team2_id = v_winner_of_series2,
                team2_seed = 10,  -- Winner from 9/10
                status = 'pending'
            WHERE bracket_id = NEW.bracket_id
              AND round_number = 0
              AND series_number = 3;

            RAISE NOTICE 'Series 3 populated: % vs %', v_loser_of_series1, v_winner_of_series2;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_playin_series3_trigger ON playoff_series;
CREATE TRIGGER update_playin_series3_trigger
AFTER UPDATE ON playoff_series
FOR EACH ROW
EXECUTE FUNCTION update_playin_series3();

RAISE NOTICE 'Play-in tournament seeding functions created';
