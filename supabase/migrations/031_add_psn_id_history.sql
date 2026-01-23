-- Create PSN ID history table
CREATE TABLE IF NOT EXISTS psn_id_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_psn_id TEXT NOT NULL,
  new_psn_id TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_psn_id_history_user_id ON psn_id_history(user_id);
CREATE INDEX idx_psn_id_history_old_psn_id ON psn_id_history(old_psn_id);
CREATE INDEX idx_psn_id_history_new_psn_id ON psn_id_history(new_psn_id);

-- Add RLS policies
ALTER TABLE psn_id_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own history
CREATE POLICY "Users can view their own PSN ID history"
  ON psn_id_history
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Allow admins to view all history
CREATE POLICY "Admins can view all PSN ID history"
  ON psn_id_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to automatically create PSN ID history when profile is updated
CREATE OR REPLACE FUNCTION track_psn_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history entry if PSN ID actually changed
  IF OLD.psn_id IS DISTINCT FROM NEW.psn_id THEN
    INSERT INTO psn_id_history (user_id, old_psn_id, new_psn_id, changed_at)
    VALUES (NEW.id, OLD.psn_id, NEW.psn_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to track PSN ID changes
DROP TRIGGER IF EXISTS track_psn_id_change_trigger ON profiles;
CREATE TRIGGER track_psn_id_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.psn_id IS DISTINCT FROM NEW.psn_id)
  EXECUTE FUNCTION track_psn_id_change();

-- Add comment
COMMENT ON TABLE psn_id_history IS 'Tracks PSN ID changes for players to maintain historical data integrity';
