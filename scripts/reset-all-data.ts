/**
 * ⚠️ EXTREME DANGER: This script deletes ALL data except admin accounts
 * ⚠️ Make sure to backup your database before running this!
 * ⚠️ This action is IRREVERSIBLE!
 *
 * This will delete:
 * - All match statistics
 * - All matches
 * - All team rosters
 * - All teams
 * - All seasons
 * - All non-admin users and their profiles
 *
 * This will keep:
 * - Admin accounts only
 *
 * Usage:
 * 1. Make sure you have .env.local with SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: npm run reset-all
 * 3. Type 'RESET ALL DATA' when prompted to confirm
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetAllData() {
  console.log('🔍 Analyzing database...\n');

  // Get statistics
  const { data: seasons } = await supabase.from('seasons').select('id, name');
  const { data: teams } = await supabase.from('teams').select('id, name');
  const { data: matches } = await supabase.from('matches').select('id');
  const { data: matchStats } = await supabase.from('match_stats').select('id');
  const { data: rosters } = await supabase.from('team_rosters').select('id');
  const { data: nonAdminUsers } = await supabase
    .from('profiles')
    .select('id, email, role')
    .neq('role', 'admin');

  console.log('📊 Current Database Statistics:\n');
  console.log(`   Seasons: ${seasons?.length || 0}`);
  console.log(`   Teams: ${teams?.length || 0}`);
  console.log(`   Matches: ${matches?.length || 0}`);
  console.log(`   Match Stats: ${matchStats?.length || 0}`);
  console.log(`   Team Rosters: ${rosters?.length || 0}`);
  console.log(`   Non-Admin Users: ${nonAdminUsers?.length || 0}\n`);

  console.log('⚠️  THE FOLLOWING WILL BE PERMANENTLY DELETED:\n');
  console.log('   ✗ All match statistics');
  console.log('   ✗ All matches');
  console.log('   ✗ All team rosters');
  console.log('   ✗ All teams');
  console.log('   ✗ All seasons');
  console.log('   ✗ All non-admin users and profiles\n');

  console.log('✅ THE FOLLOWING WILL BE KEPT:\n');
  console.log('   ✓ Admin accounts only\n');

  // Ask for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(
      'Type "RESET ALL DATA" (exact phrase) to confirm complete reset: ',
      resolve
    );
  });

  rl.close();

  if (answer !== 'RESET ALL DATA') {
    console.log('\n❌ Reset cancelled. No changes made.');
    return;
  }

  console.log('\n🗑️  Starting complete database reset...\n');

  let errors = 0;

  try {
    // Step 1: Delete match_stats
    console.log('1/6 Deleting match statistics...');
    const { error: matchStatsError, count: matchStatsCount } = await supabase
      .from('match_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (matchStatsError) {
      console.error(`   ❌ Error: ${matchStatsError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Deleted ${matchStatsCount || matchStats?.length || 0} match statistics`);
    }

    // Step 2: Delete matches
    console.log('2/6 Deleting matches...');
    const { error: matchesError, count: matchesCount } = await supabase
      .from('matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (matchesError) {
      console.error(`   ❌ Error: ${matchesError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Deleted ${matchesCount || matches?.length || 0} matches`);
    }

    // Step 3: Delete team_rosters
    console.log('3/6 Deleting team rosters...');
    const { error: rostersError, count: rostersCount } = await supabase
      .from('team_rosters')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (rostersError) {
      console.error(`   ❌ Error: ${rostersError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Deleted ${rostersCount || rosters?.length || 0} roster entries`);
    }

    // Step 4: Delete teams
    console.log('4/6 Deleting teams...');
    const { error: teamsError, count: teamsCount } = await supabase
      .from('teams')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (teamsError) {
      console.error(`   ❌ Error: ${teamsError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Deleted ${teamsCount || teams?.length || 0} teams`);
    }

    // Step 5: Delete seasons
    console.log('5/6 Deleting seasons...');
    const { error: seasonsError, count: seasonsCount } = await supabase
      .from('seasons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (seasonsError) {
      console.error(`   ❌ Error: ${seasonsError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Deleted ${seasonsCount || seasons?.length || 0} seasons`);
    }

    // Step 6: Delete non-admin users
    console.log('6/6 Deleting non-admin users...');

    if (nonAdminUsers && nonAdminUsers.length > 0) {
      let deletedUsers = 0;

      for (const user of nonAdminUsers) {
        try {
          // Delete profile
          await supabase.from('profiles').delete().eq('id', user.id);

          // Delete auth user
          await supabase.auth.admin.deleteUser(user.id);

          deletedUsers++;
          console.log(`   - Deleted ${user.email}`);
        } catch (err: any) {
          console.error(`   ❌ Error deleting ${user.email}: ${err.message}`);
          errors++;
        }
      }

      console.log(`   ✅ Deleted ${deletedUsers} non-admin users`);
    } else {
      console.log(`   ✅ No non-admin users to delete`);
    }

    console.log('\n📊 Reset Summary:');
    console.log(`   ✅ Successful operations: ${6 - errors}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Show remaining data
    const { data: remainingUsers } = await supabase
      .from('profiles')
      .select('id, email, role')
      .order('created_at', { ascending: true });

    console.log('\n👥 Remaining Users:');
    if (remainingUsers && remainingUsers.length > 0) {
      remainingUsers.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.email} - Role: ${user.role}`);
      });
    } else {
      console.log('   No users found (this should not happen!)');
    }

    console.log('\n✅ Database reset complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Create a new season in Admin > Seasons');
    console.log('   2. Users can sign up and create teams');
    console.log('   3. Assign teams to conferences');
    console.log('   4. Start recording matches\n');

  } catch (err: any) {
    console.error('\n💥 Fatal error during reset:', err.message);
    process.exit(1);
  }
}

resetAllData().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
