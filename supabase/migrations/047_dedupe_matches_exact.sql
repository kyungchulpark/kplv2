-- ============================================================================
-- Migration: Dedupe identical matches (season + home + away + match_date)
-- ============================================================================
-- Legacy migrations were re-run multiple times, and match_date formatting
-- differences prevented the script from recognizing existing rows.
-- This collapses exact duplicates and keeps the lowest UUID as canonical.
-- ============================================================================

DO $$
DECLARE
  grp RECORD;
  canonical_id UUID;
  duplicate_id UUID;
BEGIN
  FOR grp IN
    SELECT
      season_id,
      home_team_id,
      away_team_id,
      match_date,
      ARRAY_AGG(id ORDER BY id) AS ids
    FROM matches
    GROUP BY season_id, home_team_id, away_team_id, match_date
    HAVING COUNT(*) > 1
  LOOP
    canonical_id := grp.ids[1];

    FOREACH duplicate_id IN ARRAY grp.ids LOOP
      IF duplicate_id = canonical_id THEN
        CONTINUE;
      END IF;

      -- Avoid potential collisions if a unique constraint exists on (match_id, player_id)
      DELETE FROM match_stats ms
      USING match_stats ms2
      WHERE ms.match_id = duplicate_id
        AND ms2.match_id = canonical_id
        AND ms.player_id = ms2.player_id;

      UPDATE match_stats
      SET match_id = canonical_id
      WHERE match_id = duplicate_id;

      UPDATE old_match_stats
      SET match_id = canonical_id
      WHERE match_id = duplicate_id;

      DELETE FROM matches
      WHERE id = duplicate_id;
    END LOOP;
  END LOOP;
END $$;

-- Prevent exact duplicates from being inserted again
CREATE UNIQUE INDEX IF NOT EXISTS matches_season_home_away_date_key
  ON matches (season_id, home_team_id, away_team_id, match_date);

