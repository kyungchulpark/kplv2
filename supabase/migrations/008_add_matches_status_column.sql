-- ============================================================================
-- Migration: Add status column to matches table
-- ============================================================================
-- Adds the missing status column that the application code expects.
-- This allows matches to properly transition from 'scheduled' to 'finished'.
-- ============================================================================

-- Add status column with default value
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';

-- Add check constraint for valid status values
ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled'));

-- Update existing matches that have match_stats to 'finished'
-- This fixes any matches where results were already entered
UPDATE matches m
SET status = 'finished'
WHERE EXISTS (
  SELECT 1 FROM match_stats ms WHERE ms.match_id = m.id
)
AND status != 'finished';

-- Add index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

COMMENT ON COLUMN matches.status IS '경기 상태: scheduled(예정), live(진행중), finished(종료), cancelled(취소)';
