-- ============================================================================
-- Migration: Allow admin/staff to view all profiles (for admin tools)
-- ============================================================================

DROP POLICY IF EXISTS "Admins and staff can view all profiles" ON public.profiles;

CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'staff')
    )
  );

