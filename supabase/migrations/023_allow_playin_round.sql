-- ============================================================================
-- Migration 023: Allow play-in round (round 0) and BO1 format
-- ============================================================================

-- Relax round_number to include play-in (0) and keep finals (up to 4)
ALTER TABLE playoff_series
  DROP CONSTRAINT IF EXISTS playoff_series_round_number_check;

ALTER TABLE playoff_series
  ADD CONSTRAINT playoff_series_round_number_check
  CHECK (round_number BETWEEN 0 AND 4);

-- Allow BO1 for play-in games
ALTER TABLE playoff_series
  DROP CONSTRAINT IF EXISTS playoff_series_series_format_check;

ALTER TABLE playoff_series
  ADD CONSTRAINT playoff_series_series_format_check
  CHECK (series_format IN ('BO1', 'BO3', 'BO5'));

-- ROLLBACK:
-- ALTER TABLE playoff_series DROP CONSTRAINT IF EXISTS playoff_series_round_number_check;
-- ALTER TABLE playoff_series ADD CONSTRAINT playoff_series_round_number_check CHECK (round_number BETWEEN 1 AND 4);
-- ALTER TABLE playoff_series DROP CONSTRAINT IF EXISTS playoff_series_series_format_check;
-- ALTER TABLE playoff_series ADD CONSTRAINT playoff_series_series_format_check CHECK (series_format IN ('BO3', 'BO5'));
