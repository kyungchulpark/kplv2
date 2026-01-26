-- Add YouTube channel caching to reduce API quota usage
-- This table stores resolved channel IDs and live status to avoid repeated API calls

CREATE TABLE youtube_channel_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    youtube_url TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    channel_title TEXT,
    last_resolved_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ,
    last_live_status BOOLEAN DEFAULT false,
    last_live_video_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_youtube_cache_channel_id ON youtube_channel_cache(channel_id);
CREATE INDEX idx_youtube_cache_profile ON youtube_channel_cache(profile_id);
CREATE INDEX idx_youtube_cache_last_checked ON youtube_channel_cache(last_checked_at);

-- RLS policies
ALTER TABLE youtube_channel_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read the cache
CREATE POLICY "YouTube cache viewable by all"
    ON youtube_channel_cache FOR SELECT
    USING (true);

-- Only admins and staff can manage the cache
CREATE POLICY "Admins can manage YouTube cache"
    ON youtube_channel_cache FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_youtube_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_youtube_cache_updated_at
BEFORE UPDATE ON youtube_channel_cache
FOR EACH ROW
EXECUTE FUNCTION update_youtube_cache_updated_at();

-- Comments for documentation
COMMENT ON TABLE youtube_channel_cache IS 'Caches YouTube channel IDs and live status to reduce API quota usage';
COMMENT ON COLUMN youtube_channel_cache.youtube_url IS 'Original YouTube URL from profile (handle, custom URL, or channel ID)';
COMMENT ON COLUMN youtube_channel_cache.channel_id IS 'Resolved YouTube channel ID (UC...)';
COMMENT ON COLUMN youtube_channel_cache.last_resolved_at IS 'When the channel ID was last resolved from the URL';
COMMENT ON COLUMN youtube_channel_cache.last_checked_at IS 'When we last checked for live streams';
COMMENT ON COLUMN youtube_channel_cache.last_live_status IS 'Whether a live stream was detected in the last check';
COMMENT ON COLUMN youtube_channel_cache.last_live_video_id IS 'Video ID of the last detected live stream';
