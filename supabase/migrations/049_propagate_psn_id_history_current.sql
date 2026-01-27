-- ============================================================================
-- Migration: Keep PSN history new_psn_id aligned with the current PSN ID
-- ============================================================================
-- When a user changes their PSN ID, prior manual history rows often still
-- point to the old "current" PSN ID. This updates those rows to the new
-- current PSN ID while still inserting the change record.
-- ============================================================================

CREATE OR REPLACE FUNCTION track_psn_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.psn_id IS DISTINCT FROM NEW.psn_id THEN
    -- Propagate the new current PSN ID to prior rows that pointed at the old one.
    UPDATE psn_id_history
    SET new_psn_id = NEW.psn_id
    WHERE user_id = NEW.id
      AND lower(new_psn_id) = lower(OLD.psn_id);

    INSERT INTO psn_id_history (user_id, old_psn_id, new_psn_id, changed_at)
    VALUES (NEW.id, OLD.psn_id, NEW.psn_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION track_psn_id_change() IS
  'Tracks PSN ID changes and updates prior history rows to the new current PSN ID';

-- One-time backfill: align existing history rows to the user's current PSN ID.
UPDATE psn_id_history h
SET new_psn_id = p.psn_id
FROM profiles p
WHERE p.id = h.user_id
  AND lower(h.new_psn_id) <> lower(p.psn_id);
