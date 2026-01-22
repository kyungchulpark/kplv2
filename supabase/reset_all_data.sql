-- ⚠️ EXTREME DANGER: This script deletes ALL data except admin accounts
-- ⚠️ Make sure to backup your database before running this!
-- ⚠️ This action is IRREVERSIBLE!

-- Step 1: Check what will be deleted
SELECT
  'Match Stats' as table_name,
  COUNT(*) as records_to_delete
FROM match_stats
UNION ALL
SELECT
  'Matches',
  COUNT(*)
FROM matches
UNION ALL
SELECT
  'Team Rosters',
  COUNT(*)
FROM team_rosters
UNION ALL
SELECT
  'Teams',
  COUNT(*)
FROM teams
UNION ALL
SELECT
  'Seasons',
  COUNT(*)
FROM seasons
UNION ALL
SELECT
  'Non-Admin Users',
  COUNT(*)
FROM profiles
WHERE role != 'admin';

-- ⚠️ WARNING: Review the numbers above before proceeding!
-- ⚠️ Comment out the queries above and uncomment below to execute deletion

-- Step 2: Delete match_stats
-- DELETE FROM match_stats;

-- Step 3: Delete matches
-- DELETE FROM matches;

-- Step 4: Delete team_rosters
-- DELETE FROM team_rosters;

-- Step 5: Delete teams
-- DELETE FROM teams;

-- Step 6: Delete seasons
-- DELETE FROM seasons;

-- Step 7: Delete non-admin profiles
-- DELETE FROM profiles WHERE role != 'admin';

-- Step 8: Verify remaining data
-- SELECT
--   id,
--   email,
--   role,
--   created_at
-- FROM profiles
-- ORDER BY created_at;

-- ⚠️ NOTE: auth.users for non-admin accounts must be deleted manually
-- from Supabase Dashboard > Authentication or using the TypeScript script
