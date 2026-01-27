-- ============================================================================
-- Migration: Allow users to insert their own PSN ID history rows
-- ============================================================================
-- The UI writes directly to psn_id_history, but only SELECT/ADMIN policies
-- existed. This adds a safe INSERT policy for the authenticated user.
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own PSN ID history"
  ON psn_id_history;

CREATE POLICY "Users can insert their own PSN ID history"
  ON psn_id_history FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
    )
  );

