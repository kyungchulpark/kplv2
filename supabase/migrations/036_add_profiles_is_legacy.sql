-- Add is_legacy and is_active columns to profiles table
-- is_legacy: marks historical/migrated players from legacy SQL data
-- is_active: allows admins to show/hide users from active management

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_legacy ON profiles(is_legacy);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_active ON profiles(is_legacy, is_active);

-- Add comments
COMMENT ON COLUMN profiles.is_legacy IS 'True for historical players from legacy data who have not yet created accounts';
COMMENT ON COLUMN profiles.is_active IS 'False to hide user from active management UI (e.g., legacy profiles or retired players)';
