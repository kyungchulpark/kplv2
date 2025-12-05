-- ============================================================================
-- KPL Dummy Data
-- ============================================================================
-- This script creates sample data for testing the KPL application
-- Run this AFTER running schema.sql and schema_updates.sql
-- ============================================================================

-- 1. Create Season (using proper UUID)
INSERT INTO seasons (id, name, game_version, start_date, end_date, is_active, playoff_cutoff)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '2K26 1st Season',
  '2K26',
  '2024-01-01',
  '2024-06-30',
  true,
  4
);

-- 2. Create 20 dummy users (players)
-- Note: In production, these would be real Google OAuth users
INSERT INTO profiles (id, email, psn_id, role, avatar_url, created_at)
VALUES
  -- West Conference Team 1
  ('11111111-1111-1111-1111-111111111111'::uuid, 'player1@kpl.com', 'WestWarrior_1', 'user', NULL, NOW()),
  ('11111111-1111-1111-1111-111111111112'::uuid, 'player2@kpl.com', 'WestWarrior_2', 'user', NULL, NOW()),
  ('11111111-1111-1111-1111-111111111113'::uuid, 'player3@kpl.com', 'WestWarrior_3', 'user', NULL, NOW()),
  ('11111111-1111-1111-1111-111111111114'::uuid, 'player4@kpl.com', 'WestWarrior_4', 'user', NULL, NOW()),
  ('11111111-1111-1111-1111-111111111115'::uuid, 'player5@kpl.com', 'WestWarrior_5', 'captain', NULL, NOW()),

  -- West Conference Team 2
  ('22222222-2222-2222-2222-222222222221'::uuid, 'player6@kpl.com', 'WestPhoenix_1', 'user', NULL, NOW()),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'player7@kpl.com', 'WestPhoenix_2', 'user', NULL, NOW()),
  ('22222222-2222-2222-2222-222222222223'::uuid, 'player8@kpl.com', 'WestPhoenix_3', 'user', NULL, NOW()),
  ('22222222-2222-2222-2222-222222222224'::uuid, 'player9@kpl.com', 'WestPhoenix_4', 'user', NULL, NOW()),
  ('22222222-2222-2222-2222-222222222225'::uuid, 'player10@kpl.com', 'WestPhoenix_5', 'captain', NULL, NOW()),

  -- East Conference Team 1
  ('33333333-3333-3333-3333-333333333331'::uuid, 'player11@kpl.com', 'EastTigers_1', 'user', NULL, NOW()),
  ('33333333-3333-3333-3333-333333333332'::uuid, 'player12@kpl.com', 'EastTigers_2', 'user', NULL, NOW()),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'player13@kpl.com', 'EastTigers_3', 'user', NULL, NOW()),
  ('33333333-3333-3333-3333-333333333334'::uuid, 'player14@kpl.com', 'EastTigers_4', 'user', NULL, NOW()),
  ('33333333-3333-3333-3333-333333333335'::uuid, 'player15@kpl.com', 'EastTigers_5', 'captain', NULL, NOW()),

  -- East Conference Team 2
  ('44444444-4444-4444-4444-444444444441'::uuid, 'player16@kpl.com', 'EastDragons_1', 'user', NULL, NOW()),
  ('44444444-4444-4444-4444-444444444442'::uuid, 'player17@kpl.com', 'EastDragons_2', 'user', NULL, NOW()),
  ('44444444-4444-4444-4444-444444444443'::uuid, 'player18@kpl.com', 'EastDragons_3', 'user', NULL, NOW()),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'player19@kpl.com', 'EastDragons_4', 'user', NULL, NOW()),
  ('44444444-4444-4444-4444-444444444445'::uuid, 'player20@kpl.com', 'EastDragons_5', 'captain', NULL, NOW());

-- 3. Create Teams
INSERT INTO teams (id, season_id, name, conference, region, captain_id, logo_url, wins, losses, points_for, points_against, status)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'West Warriors',
    'West',
    '서부',
    '11111111-1111-1111-1111-111111111115'::uuid,
    NULL,
    3,
    2,
    520,
    505,
    'active'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'West Phoenix',
    'West',
    '서부',
    '22222222-2222-2222-2222-222222222225'::uuid,
    NULL,
    2,
    3,
    495,
    510,
    'active'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'East Tigers',
    'East',
    '동부',
    '33333333-3333-3333-3333-333333333335'::uuid,
    NULL,
    4,
    1,
    545,
    480,
    'active'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'East Dragons',
    'East',
    '동부',
    '44444444-4444-4444-4444-444444444445'::uuid,
    NULL,
    1,
    4,
    475,
    540,
    'active'
  );

-- 4. Create Team Rosters
INSERT INTO team_rosters (team_id, player_id, jersey_number, position, is_active)
VALUES
  -- West Warriors
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 23, 'PG', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111112'::uuid, 11, 'SG', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111113'::uuid, 7, 'SF', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111114'::uuid, 35, 'PF', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111115'::uuid, 5, 'C', true),

  -- West Phoenix
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222221'::uuid, 1, 'PG', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 13, 'SG', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222223'::uuid, 3, 'SF', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222224'::uuid, 44, 'PF', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222225'::uuid, 12, 'C', true),

  -- East Tigers
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333331'::uuid, 0, 'PG', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333332'::uuid, 2, 'SG', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 22, 'SF', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 21, 'PF', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333335'::uuid, 33, 'C', true),

  -- East Dragons
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444441'::uuid, 10, 'PG', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444442'::uuid, 24, 'SG', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444443'::uuid, 8, 'SF', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 15, 'PF', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 20, 'C', true);

-- 5. Create Matches (5 games)
INSERT INTO matches (id, season_id, home_team_id, away_team_id, match_date, status, home_score, away_score)
VALUES
  -- Game 1: West Warriors vs West Phoenix
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '2024-01-09 22:40:00',
    'finished',
    108,
    95
  ),
  -- Game 2: East Tigers vs East Dragons
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    '2024-01-09 23:20:00',
    'finished',
    115,
    92
  ),
  -- Game 3: West Warriors vs East Tigers
  (
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    '2024-01-11 22:40:00',
    'finished',
    102,
    110
  ),
  -- Game 4: West Phoenix vs East Dragons
  (
    '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    '2024-01-11 23:20:00',
    'finished',
    98,
    89
  ),
  -- Game 5: East Tigers vs West Warriors
  (
    '33333333-cccc-cccc-cccc-cccccccccccc'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '2024-01-14 22:40:00',
    'finished',
    120,
    105
  );

-- 6. Create Match Stats for Game 1 (West Warriors 108 vs West Phoenix 95)
INSERT INTO match_stats (match_id, player_id, team_id, grade, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, three_pm, three_pa, ftm, fta)
VALUES
  -- West Warriors (Home)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'A', 28, 5, 8, 2, 0, 2, 3, 10, 18, 3, 6, 5, 6),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '11111111-1111-1111-1111-111111111112'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B+', 22, 3, 2, 1, 0, 3, 2, 8, 15, 4, 8, 2, 2),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '11111111-1111-1111-1111-111111111113'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B', 18, 6, 4, 2, 1, 2, 1, 7, 12, 2, 5, 2, 3),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '11111111-1111-1111-1111-111111111114'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'A-', 25, 10, 3, 1, 2, 3, 2, 10, 16, 1, 3, 4, 5),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '11111111-1111-1111-1111-111111111115'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B', 15, 12, 2, 0, 3, 4, 1, 6, 10, 0, 1, 3, 4),

  -- West Phoenix (Away)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '22222222-2222-2222-2222-222222222221'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B', 20, 4, 7, 3, 0, 2, 4, 7, 14, 2, 5, 4, 4),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'C+', 15, 2, 1, 1, 0, 3, 2, 5, 12, 3, 7, 2, 2),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '22222222-2222-2222-2222-222222222223'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B-', 18, 5, 3, 2, 1, 2, 3, 7, 13, 2, 6, 2, 3),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '22222222-2222-2222-2222-222222222224'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B', 22, 8, 2, 1, 2, 4, 2, 9, 15, 1, 3, 3, 4),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '22222222-2222-2222-2222-222222222225'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B+', 20, 11, 1, 0, 4, 3, 2, 8, 12, 0, 0, 4, 6);

-- Game 2 Stats (East Tigers 115 vs East Dragons 92)
INSERT INTO match_stats (match_id, player_id, team_id, grade, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, three_pm, three_pa, ftm, fta)
VALUES
  -- East Tigers (Home)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '33333333-3333-3333-3333-333333333331'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A+', 32, 6, 10, 4, 0, 1, 2, 11, 19, 5, 9, 5, 6),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '33333333-3333-3333-3333-333333333332'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A-', 24, 4, 3, 2, 1, 2, 1, 9, 16, 3, 7, 3, 4),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'B+', 20, 7, 5, 3, 2, 3, 2, 8, 14, 2, 5, 2, 2),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A', 27, 9, 4, 1, 3, 2, 1, 11, 17, 2, 4, 3, 3),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '33333333-3333-3333-3333-333333333335'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'B', 12, 15, 2, 1, 5, 4, 3, 5, 9, 0, 0, 2, 4),

  -- East Dragons (Away)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '44444444-4444-4444-4444-444444444441'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'C', 16, 3, 5, 2, 0, 3, 5, 6, 15, 2, 7, 2, 3),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '44444444-4444-4444-4444-444444444442'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'C+', 18, 2, 2, 1, 0, 2, 3, 7, 14, 1, 5, 3, 4),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '44444444-4444-4444-4444-444444444443'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'B-', 20, 6, 3, 2, 1, 3, 2, 8, 16, 2, 6, 2, 2),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'B', 22, 7, 1, 1, 2, 4, 2, 9, 14, 1, 2, 3, 5),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'C+', 16, 10, 0, 0, 3, 5, 4, 6, 11, 0, 1, 4, 6);

-- Game 3 Stats (West Warriors 102 vs East Tigers 110)
INSERT INTO match_stats (match_id, player_id, team_id, grade, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, three_pm, three_pa, ftm, fta)
VALUES
  -- West Warriors (Home)
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B+', 26, 4, 9, 3, 0, 2, 4, 9, 17, 4, 8, 4, 5),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111112'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B', 19, 3, 1, 2, 0, 3, 2, 7, 14, 3, 7, 2, 2),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111113'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'C+', 15, 5, 3, 1, 1, 2, 3, 6, 13, 1, 4, 2, 3),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111114'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B', 24, 11, 2, 1, 2, 4, 2, 10, 18, 1, 3, 3, 4),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111115'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B-', 18, 10, 1, 0, 2, 3, 2, 8, 13, 0, 1, 2, 4),

  -- East Tigers (Away)
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333331'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A', 30, 5, 11, 4, 0, 1, 3, 11, 18, 4, 8, 4, 5),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333332'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A-', 23, 3, 4, 2, 1, 2, 2, 9, 15, 2, 5, 3, 3),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'B+', 21, 6, 4, 3, 1, 2, 1, 8, 13, 3, 6, 2, 2),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A', 26, 8, 3, 2, 2, 3, 2, 10, 16, 2, 4, 4, 5),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333335'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'B', 10, 14, 2, 0, 4, 4, 2, 4, 8, 0, 0, 2, 3);

-- Game 4 Stats (West Phoenix 98 vs East Dragons 89)
INSERT INTO match_stats (match_id, player_id, team_id, grade, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, three_pm, three_pa, ftm, fta)
VALUES
  -- West Phoenix (Home)
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222221'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'A-', 25, 5, 8, 3, 0, 2, 3, 9, 16, 3, 6, 4, 5),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B+', 20, 3, 2, 2, 0, 3, 2, 7, 13, 4, 8, 2, 2),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222223'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B', 17, 6, 4, 2, 1, 2, 2, 6, 12, 3, 6, 2, 3),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222224'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'A', 26, 9, 3, 1, 3, 3, 1, 11, 17, 1, 2, 3, 4),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222225'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B-', 10, 13, 1, 0, 3, 4, 2, 4, 9, 0, 0, 2, 4),

  -- East Dragons (Away)
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444441'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'B-', 18, 4, 6, 2, 0, 3, 4, 7, 16, 2, 7, 2, 3),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444442'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'B', 19, 2, 3, 1, 0, 2, 2, 7, 13, 3, 6, 2, 3),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444443'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'B', 21, 5, 2, 2, 1, 3, 3, 8, 14, 3, 7, 2, 2),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'B+', 22, 8, 2, 1, 2, 3, 2, 9, 15, 1, 3, 3, 4),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'C+', 9, 11, 1, 0, 2, 5, 3, 3, 9, 0, 0, 3, 5);

-- Game 5 Stats (East Tigers 120 vs West Warriors 105)
INSERT INTO match_stats (match_id, player_id, team_id, grade, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, three_pm, three_pa, ftm, fta)
VALUES
  -- East Tigers (Home)
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333331'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A+', 35, 7, 12, 5, 0, 1, 2, 13, 20, 5, 10, 4, 5),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333332'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A', 28, 4, 4, 3, 1, 2, 1, 11, 17, 3, 6, 3, 4),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A-', 24, 8, 6, 3, 2, 2, 2, 9, 15, 4, 8, 2, 2),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'A-', 23, 10, 3, 2, 3, 3, 1, 9, 15, 2, 5, 3, 4),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333335'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'B+', 10, 16, 3, 1, 6, 4, 2, 4, 7, 0, 0, 2, 3),

  -- West Warriors (Away)
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B+', 27, 5, 8, 2, 0, 2, 3, 10, 19, 3, 7, 4, 5),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111112'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B', 21, 3, 2, 1, 0, 3, 3, 8, 16, 3, 8, 2, 2),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111113'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B-', 16, 6, 3, 2, 1, 2, 2, 6, 14, 2, 6, 2, 3),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111114'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B+', 26, 12, 2, 1, 2, 4, 2, 11, 19, 1, 3, 3, 4),
  ('33333333-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111115'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'B-', 15, 11, 2, 0, 3, 3, 2, 6, 11, 0, 1, 3, 5);

-- ============================================================================
-- Summary of Dummy Data Created:
-- ============================================================================
-- - 1 Season: 2K26 1st Season (active)
-- - 4 Teams: 2 West, 2 East
-- - 20 Players: 5 per team (4 users + 1 captain per team)
-- - 5 Matches: All finished with scores
-- - 50 Match Stats: 10 players per match (5v5)
--
-- Team Records after 5 games:
-- East Tigers: 4-1 (545 PF, 480 PA) - Best record
-- West Warriors: 3-2 (520 PF, 505 PA)
-- West Phoenix: 2-3 (495 PF, 510 PA)
-- East Dragons: 1-4 (475 PF, 540 PA) - Worst record
-- ============================================================================
