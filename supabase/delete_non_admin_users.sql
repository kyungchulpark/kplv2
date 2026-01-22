-- ⚠️ DANGER: This script deletes all non-admin users
-- ⚠️ Make sure to backup your database before running this!
-- ⚠️ This action is irreversible!

-- Step 1: Get count of users that will be deleted (for verification)
SELECT
  COUNT(*) as users_to_delete,
  STRING_AGG(email, ', ') as user_emails
FROM profiles
WHERE role != 'admin';

-- Step 2: Delete from team_rosters (players who are not admin)
DELETE FROM team_rosters
WHERE player_id IN (
  SELECT id FROM profiles WHERE role != 'admin'
);

-- Step 3: Handle teams where captain is not admin
-- Option A: Delete teams where captain is not admin
DELETE FROM teams
WHERE captain_id IN (
  SELECT id FROM profiles WHERE role != 'admin'
);

-- Option B: Set captain_id to NULL instead (if you want to keep teams)
-- UPDATE teams
-- SET captain_id = NULL
-- WHERE captain_id IN (
--   SELECT id FROM profiles WHERE role != 'admin'
-- );

-- Step 4: Delete match_stats for non-admin players
DELETE FROM match_stats
WHERE player_id IN (
  SELECT id FROM profiles WHERE role != 'admin'
);

-- Step 5: Delete profiles (this will cascade to auth.users if RLS allows)
DELETE FROM profiles
WHERE role != 'admin';

-- Step 6: Verify remaining users
SELECT
  id,
  email,
  psn_id,
  role,
  created_at
FROM profiles
ORDER BY created_at;

-- ⚠️ NOTE: auth.users might still exist in Supabase Auth
-- You may need to manually delete them from Supabase Dashboard > Authentication
-- Or use the Supabase Management API with service role key

-- Alternative: If you have access to auth schema (service role required):
-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT id FROM auth.users
--   WHERE id NOT IN (SELECT id FROM profiles WHERE role = 'admin')
-- );
