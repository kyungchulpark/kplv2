-- ============================================================================
-- Migration: 005_add_stream_links
-- Description: Add streaming URLs and screenshot URL columns to matches table
-- Date: 2025-12-09
-- ============================================================================

-- Add YouTube/streaming link columns to matches table
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_stream_url TEXT,
  ADD COLUMN IF NOT EXISTS away_stream_url TEXT,
  ADD COLUMN IF NOT EXISTS result_screenshot_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN matches.home_stream_url IS '홈팀 스트리밍 URL (YouTube 등, 필수)';
COMMENT ON COLUMN matches.away_stream_url IS '원정팀 스트리밍 URL (YouTube 등, 필수)';
COMMENT ON COLUMN matches.result_screenshot_url IS 'Supabase Storage에 저장된 경기결과 스크린샷 URL';
