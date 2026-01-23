-- Function to automatically link match_stats when PSN ID history is added
-- This links historical match data from migrated legacy data to user accounts
CREATE OR REPLACE FUNCTION auto_link_match_stats_on_psn_history()
RETURNS TRIGGER AS $$
DECLARE
  linked_count INTEGER;
BEGIN
  -- Find and update match_stats records where:
  -- 1. player_id is NULL (unmapped from migration)
  -- 2. psn_id matches the old_psn_id from history entry
  -- Link them to the user who added this PSN ID history
  WITH updated AS (
    UPDATE match_stats
    SET player_id = NEW.user_id
    WHERE player_id IS NULL
      AND psn_id = NEW.old_psn_id
    RETURNING id
  )
  SELECT COUNT(*) INTO linked_count FROM updated;

  -- Log the linking action
  IF linked_count > 0 THEN
    RAISE NOTICE 'Auto-linked % match_stats records for PSN ID "%" to user %',
      linked_count, NEW.old_psn_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-link match stats when PSN ID history is added
DROP TRIGGER IF EXISTS auto_link_match_stats_trigger ON psn_id_history;
CREATE TRIGGER auto_link_match_stats_trigger
  AFTER INSERT ON psn_id_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_match_stats_on_psn_history();

-- Add comment
COMMENT ON FUNCTION auto_link_match_stats_on_psn_history IS
  'Automatically links historical match_stats records (with NULL player_id) to users when they add previous PSN IDs';

-- Backfill: Link any existing PSN ID history entries
-- This handles cases where history was added before this migration
DO $$
DECLARE
  history_record RECORD;
  linked_count INTEGER;
  total_linked INTEGER := 0;
BEGIN
  FOR history_record IN
    SELECT user_id, old_psn_id
    FROM psn_id_history
    ORDER BY changed_at ASC
  LOOP
    WITH updated AS (
      UPDATE match_stats
      SET player_id = history_record.user_id
      WHERE player_id IS NULL
        AND psn_id = history_record.old_psn_id
      RETURNING id
    )
    SELECT COUNT(*) INTO linked_count FROM updated;

    total_linked := total_linked + linked_count;

    IF linked_count > 0 THEN
      RAISE NOTICE 'Backfilled % match_stats records for PSN ID "%"',
        linked_count, history_record.old_psn_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total backfilled records: %', total_linked;
END $$;
