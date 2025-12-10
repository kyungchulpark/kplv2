-- ============================================================================
-- Migration 013: Fix Match Dates and Times (KST → UTC Conversion)
-- ============================================================================
-- Problem: Match times were stored incorrectly
-- Example: 22:20 KST was stored as 23:20 UTC (should be 13:20 UTC)
-- This caused times to display as 08:20 instead of 22:20
-- Also dates were shifted by 1 day
-- ============================================================================

-- Step 1: Check current state (for verification)
DO $$
DECLARE
    sample_match RECORD;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'BEFORE FIX - Sample Match Times:';
    RAISE NOTICE '==============================================';

    FOR sample_match IN
        SELECT id, match_date, match_date AT TIME ZONE 'Asia/Seoul' as kst_time
        FROM matches
        ORDER BY match_date DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Match ID: % | UTC: % | KST: %',
            sample_match.id,
            sample_match.match_date,
            sample_match.kst_time;
    END LOOP;
    RAISE NOTICE '==============================================';
END $$;

-- Step 2: Fix the dates - add 1 day to all match_date
-- Dates were stored 1 day earlier than they should be
-- Example: 2025-12-10 14:20:00+00 → 2025-12-11 14:20:00+00
UPDATE matches
SET match_date = match_date + INTERVAL '1 day',
    updated_at = NOW();

-- Step 3: Verify the fix
DO $$
DECLARE
    sample_match RECORD;
    total_updated INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_updated FROM matches;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'AFTER FIX - Sample Match Times:';
    RAISE NOTICE 'Total matches updated: %', total_updated;
    RAISE NOTICE '==============================================';

    FOR sample_match IN
        SELECT id, match_date, match_date AT TIME ZONE 'Asia/Seoul' as kst_time
        FROM matches
        ORDER BY match_date DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Match ID: % | UTC: % | KST: %',
            sample_match.id,
            sample_match.match_date,
            sample_match.kst_time;
    END LOOP;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Verify that KST times now show 22:20, 23:20, etc.';
    RAISE NOTICE 'and dates are correct (not shifted by 1 day)';
    RAISE NOTICE '==============================================';
END $$;

-- ROLLBACK (if needed):
-- UPDATE matches SET match_date = match_date - INTERVAL '1 day';
