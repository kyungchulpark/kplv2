-- ============================================================================
-- Migration 024: Add YouTube Channel to Profiles
-- ============================================================================
-- Adds youtube_channel column for live streaming feature
-- ============================================================================

-- Add youtube_channel column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS youtube_channel TEXT;

-- Create index for finding active streamers
CREATE INDEX IF NOT EXISTS idx_profiles_youtube_channel
ON profiles(youtube_channel) WHERE youtube_channel IS NOT NULL;

RAISE NOTICE 'YouTube channel column added to profiles table';
