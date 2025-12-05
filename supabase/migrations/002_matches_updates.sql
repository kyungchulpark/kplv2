-- ============================================================================
-- Migration: 002_matches_updates
-- Description: Add game_password, result_uploaded, and match_sequence columns to matches table
-- Created: 2025-12-05
-- ============================================================================

-- Add new columns to matches table
ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS game_password TEXT,
    ADD COLUMN IF NOT EXISTS result_uploaded BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS match_sequence TEXT;

-- Create index on match_sequence for fast lookups during Excel import
CREATE INDEX IF NOT EXISTS idx_matches_sequence ON matches(match_sequence);

-- Create unique constraint on match_sequence to prevent duplicates
-- (allowing NULL values, as not all matches will have a sequence)
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_sequence_unique
    ON matches(match_sequence)
    WHERE match_sequence IS NOT NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN matches.game_password IS 'Password for private game room (optional)';
COMMENT ON COLUMN matches.result_uploaded IS 'Indicates whether match statistics have been uploaded';
COMMENT ON COLUMN matches.match_sequence IS 'Unique sequence identifier from Excel upload (e.g., 20250417_001)';
