# KPL Phase 2-4 Deployment Guide

## Overview
This guide covers the deployment of Phase 2-4 features including points system, penalties, forfeits, team withdrawals, playoffs, and championship tracking.

**Status**: UI components deployed ✅ | SQL migrations pending ⏳

---

## Phase 2: Points, Penalties, Forfeits & Withdrawals

### Features Implemented

#### 1. Points System (Migration 014)
- **승점 시스템**: Win = 2pts, Loss = 1pt
- **몰수승**: Forfeit Win = 2pts, Forfeit Loss = 0pts
- **Head-to-head**: JSONB tracking for tiebreakers
- **Ranking**: Points → PPG → Total Points Scored

**Changes**:
- Added `teams.points` column
- Added `teams.head_to_head` JSONB column
- Updated trigger `update_team_standings()` for points calculation
- Backfilled all existing matches

#### 2. Penalty System (Migration 015)
- **감점 시스템**: 0.5 increments (0.5, 1.0, 1.5...)
- **Penalty tracking**: `team_penalties` table with reason and admin ID
- **Net points**: `points - penalty_points` for actual ranking

**Changes**:
- Created `team_penalties` table
- Added `teams.penalty_points` column
- Updated `current_standings` view to include penalties
- Admin UI: `/admin/team-management` (Penalty Manager)

#### 3. Forfeit System (Migration 016)
- **몰수 처리**: Admin declares winner without player stats
- **Automatic scoring**: Winner +2pts/+1W, Loser +0pts/+1L
- **No player stats**: Stats not recorded for forfeit matches

**Changes**:
- Added `matches.is_forfeit`, `forfeit_winner_id`, `forfeit_reason`
- Updated trigger to handle forfeit logic
- Admin UI: Forfeit dialog in match management

#### 4. Team Withdrawal (Migration 017)
- **팀 탈퇴**: Mark teams as withdrawn mid-season
- **Auto-cancel matches**: Trigger cancels all future scheduled matches
- **Display**: Strikethrough + "(탈퇴)" badge in standings

**Changes**:
- Created `team_withdrawals` table
- Added `teams.is_withdrawn` boolean
- Created trigger `cancel_withdrawn_team_matches()`
- Updated `current_standings` view
- Admin UI: `/admin/team-management` (Withdrawal Manager)

---

## Phase 3: UI/UX Enhancements

### Already Deployed ✅
- Standings page with tabs (전체/Western/Eastern)
- Conference color theming (West=Red, East=Blue)
- Penalty column in standings table
- Withdrawal status display (strikethrough + badge)
- PPG/PAPG with 1 decimal precision

---

## Phase 4: Playoffs & Championships

### Features Implemented

#### 1. Playoff System (Migration 018)
- **Conference-based brackets**: Western/Eastern separate brackets
- **Series formats**: BO3 (Best of 3) for Rounds 1-2, BO5 (Best of 5) for Championship
- **Auto-seeding**: Function `seed_playoff_bracket(season_id, conference)`
- **Separate stats**: `playoff_stats` table for playoff player stats

**Tables**:
- `playoff_brackets`: Season + Conference brackets
- `playoff_series`: Series info (teams, seeds, wins, format)
- `playoff_matches`: Individual playoff games
- `playoff_stats`: Player stats for playoff matches

**UI**: `/playoffs` page with bracket visualization

#### 2. Championship Tracking (Migration 019)
- **Championship records**: Winner, runner-up, series score
- **MVPs**: Finals MVP, Regular Season MVP
- **Season awards**: Scoring/Assist/Rebound leaders, DPOY, All-Star
- **Auto-award leaders**: Function `award_season_leaders(season_id)`

**Tables**:
- `season_champions`: Championship info per season
- `season_awards`: Individual player awards

**UI**: `/history` page showing all championship records

---

## Deployment Steps

### Prerequisites
1. Backup database before running migrations
2. Verify active season exists
3. Ensure admin user is logged in

### Step 1: Run SQL Migrations (IN ORDER)

Execute migrations in Supabase SQL Editor in this exact order:

```bash
# Phase 2: Core Systems
014_add_points_system.sql
015_add_penalty_system.sql
016_add_forfeit_system.sql
017_add_team_withdrawal.sql

# Phase 4: Advanced Features
018_add_playoff_system.sql
019_add_season_champions.sql
```

**Migration Files Location**: `supabase/migrations/`

### Step 2: Verify Migrations

After each migration, check for success messages:

```sql
-- Migration 014
NOTICE: Points System Migration Completed

-- Migration 015
NOTICE: Penalty System Migration Completed

-- Migration 016
NOTICE: Forfeit System Migration Completed

-- Migration 017
NOTICE: Team Withdrawal Migration Completed

-- Migration 018
NOTICE: Playoff System Migration Completed

-- Migration 019
NOTICE: Season Champions Migration Completed
```

### Step 3: Verify Database Changes

```sql
-- Check new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teams'
  AND column_name IN ('points', 'penalty_points', 'is_withdrawn');

-- Check new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('team_penalties', 'team_withdrawals', 'playoff_brackets', 'season_champions');

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('update_team_standings_trigger', 'cancel_withdrawn_team_matches_trigger');
```

### Step 4: Test Functionality

#### Test Points System
1. Go to `/admin/matches`
2. Finish a match
3. Verify teams' `points` updated (+2 for winner, +1 for loser)
4. Check standings page shows correct points

#### Test Penalty System
1. Go to `/admin/team-management`
2. Add 0.5 penalty to a team
3. Verify penalty appears in standings table
4. Check net points calculation

#### Test Forfeit System
1. Go to `/admin/matches`
2. Declare a match as forfeit
3. Verify winner gets +2pts, loser gets +0pts
4. Verify NO player stats recorded

#### Test Withdrawal
1. Go to `/admin/team-management`
2. Withdraw a team
3. Verify future matches auto-cancelled
4. Check standings shows "(탈퇴)" badge

#### Test Playoffs
1. Create playoff bracket:
   ```sql
   SELECT seed_playoff_bracket(
     '<season_id>'::uuid,
     'West'
   );
   ```
2. Visit `/playoffs` page
3. Verify bracket displays correctly

#### Test Championship
1. Record championship:
   ```sql
   SELECT record_championship(
     '<season_id>'::uuid,
     '<champion_team_id>'::uuid,
     '<runner_up_team_id>'::uuid,
     '<finals_mvp_id>'::uuid,
     3,  -- series_wins
     1   -- series_losses
   );
   ```
2. Visit `/history` page
3. Verify championship displays correctly

---

## New Admin Pages

1. **Team Management** (`/admin/team-management`)
   - Penalty Manager: Add/remove team penalties
   - Withdrawal Manager: Mark teams as withdrawn or restore them

2. **Playoffs** (`/playoffs`)
   - View Western/Eastern conference brackets
   - See series status, scores, and winners

3. **Championship History** (`/history`)
   - View all past champions
   - See MVPs and season awards

---

## Database Functions Reference

### Points & Standings
- `update_team_standings()`: Auto-update wins/losses/points on match finish
- Trigger: `update_team_standings_trigger` on `matches` table

### Penalties
- Manual admin management via UI
- Records stored in `team_penalties` table

### Forfeits
- `update_team_standings()`: Handles forfeit logic
- Auto-applies when `matches.is_forfeit = true`

### Withdrawals
- `cancel_withdrawn_team_matches()`: Auto-cancel future matches
- Trigger: `cancel_withdrawn_team_matches_trigger` on `teams` table

### Playoffs
- `seed_playoff_bracket(season_id, conference)`: Create bracket, seed top 8 teams
- `update_playoff_series_winner()`: Auto-update series winner on match finish

### Championships
- `record_championship(...)`: Record championship results
- `award_season_leaders(season_id)`: Auto-award scoring/assist/rebound leaders

---

## RLS Policies

All new tables have Row Level Security enabled:

- **View (SELECT)**: Anyone can view
- **Modify (INSERT/UPDATE/DELETE)**: Admin only (`profiles.role = 'admin'`)

---

## Rollback Instructions

If you need to rollback, execute at the bottom of each migration file:

```sql
-- Migration 014 Rollback
DROP TRIGGER IF EXISTS update_team_standings_trigger ON matches;
DROP FUNCTION IF EXISTS update_team_standings() CASCADE;
ALTER TABLE teams DROP COLUMN IF EXISTS points CASCADE;
ALTER TABLE teams DROP COLUMN IF EXISTS head_to_head CASCADE;

-- Migration 015 Rollback
DROP VIEW IF EXISTS current_standings;
DROP TABLE IF EXISTS team_penalties;
ALTER TABLE teams DROP COLUMN IF EXISTS penalty_points CASCADE;

-- Migration 016 Rollback
ALTER TABLE matches DROP COLUMN IF EXISTS is_forfeit CASCADE;
ALTER TABLE matches DROP COLUMN IF EXISTS forfeit_winner_id CASCADE;
ALTER TABLE matches DROP COLUMN IF EXISTS forfeit_reason CASCADE;

-- Migration 017 Rollback
DROP TRIGGER IF EXISTS cancel_withdrawn_team_matches_trigger ON teams;
DROP FUNCTION IF EXISTS cancel_withdrawn_team_matches() CASCADE;
DROP TABLE IF EXISTS team_withdrawals;
ALTER TABLE teams DROP COLUMN IF EXISTS is_withdrawn CASCADE;

-- Migration 018 Rollback
DROP TRIGGER IF EXISTS update_playoff_series_on_match_finish ON playoff_matches;
DROP FUNCTION IF EXISTS update_playoff_series_winner() CASCADE;
DROP FUNCTION IF EXISTS seed_playoff_bracket(UUID, TEXT);
DROP TABLE IF EXISTS playoff_stats;
DROP TABLE IF EXISTS playoff_matches;
DROP TABLE IF EXISTS playoff_series;
DROP TABLE IF EXISTS playoff_brackets;

-- Migration 019 Rollback
DROP VIEW IF EXISTS championship_history;
DROP FUNCTION IF EXISTS record_championship(UUID, UUID, UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS award_season_leaders(UUID);
DROP TABLE IF EXISTS season_awards;
DROP TABLE IF EXISTS season_champions;
```

---

## Notes

- ⚠️ All migrations include backfilling of existing data where applicable
- ⚠️ Make sure to backup database before running migrations
- ⚠️ SQL migrations are LOCAL ONLY - not pushed to git per user request
- ✅ UI components are deployed and live
- ✅ All admin UIs are functional once migrations are run

---

## Support

If you encounter issues:

1. Check migration error messages in Supabase SQL Editor
2. Verify all previous migrations completed successfully
3. Check database logs for trigger errors
4. Review RLS policies if permission errors occur

---

**Last Updated**: 2025-12-10
**UI Version**: Phase 2-4 Complete ✅
**DB Version**: Migrations 014-019 Pending ⏳
