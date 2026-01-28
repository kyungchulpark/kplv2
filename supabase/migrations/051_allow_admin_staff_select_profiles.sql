-- ============================================================================
-- Migration: Allow admin/staff to view all profiles (for admin tools)
-- ============================================================================
-- NOTE: Use a SECURITY DEFINER helper to avoid recursive policy checks.
-- ============================================================================

-- 1. Helper function (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Replace policy
DROP POLICY IF EXISTS "Admins and staff can view all profiles" ON public.profiles;

CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin_or_staff()
  );

