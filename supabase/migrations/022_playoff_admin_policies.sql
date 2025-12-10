-- ============================================================================
-- Migration 022: Fix playoff RLS to allow admin seeding/updates
-- ============================================================================

-- Admin manage playoff_series
DROP POLICY IF EXISTS "Admins can manage playoff series" ON playoff_series;
CREATE POLICY "Admins can manage playoff series"
    ON playoff_series FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin manage playoff_matches
DROP POLICY IF EXISTS "Admins can manage playoff matches" ON playoff_matches;
CREATE POLICY "Admins can manage playoff matches"
    ON playoff_matches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin manage playoff_stats
DROP POLICY IF EXISTS "Admins can manage playoff stats" ON playoff_stats;
CREATE POLICY "Admins can manage playoff stats"
    ON playoff_stats FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Verify
DO $$
BEGIN
    RAISE NOTICE 'Playoff RLS updated: admins can insert/update/delete series/matches/stats';
END $$;

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Admins can manage playoff series" ON playoff_series;
-- DROP POLICY IF EXISTS "Admins can manage playoff matches" ON playoff_matches;
-- DROP POLICY IF EXISTS "Admins can manage playoff stats" ON playoff_stats;
