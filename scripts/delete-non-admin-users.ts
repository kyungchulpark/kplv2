/**
 * ⚠️ DANGER: This script deletes all non-admin users
 * ⚠️ Make sure to backup your database before running this!
 * ⚠️ This action is irreversible!
 *
 * Usage:
 * 1. Make sure you have .env.local with SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: npx tsx scripts/delete-non-admin-users.ts
 * 3. Type 'DELETE' when prompted to confirm
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

async function deleteNonAdminUsers() {
  console.log('🔍 Fetching non-admin users...\n');

  // Get all non-admin users
  const { data: nonAdminUsers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, psn_id, role')
    .neq('role', 'admin');

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError);
    return;
  }

  if (!nonAdminUsers || nonAdminUsers.length === 0) {
    console.log('✅ No non-admin users found. Nothing to delete.');
    return;
  }

  console.log(`⚠️  Found ${nonAdminUsers.length} non-admin users:\n`);
  nonAdminUsers.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email} (${user.psn_id || 'No PSN'}) - Role: ${user.role}`);
  });

  console.log('\n⚠️  These users and ALL their data will be PERMANENTLY DELETED!');
  console.log('⚠️  This includes:');
  console.log('   - Team rosters');
  console.log('   - Teams they captain');
  console.log('   - Match statistics');
  console.log('   - Profile data');
  console.log('   - Authentication accounts\n');

  // Ask for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "DELETE" (in capitals) to confirm deletion: ', resolve);
  });

  rl.close();

  if (answer !== 'DELETE') {
    console.log('\n❌ Deletion cancelled. No changes made.');
    return;
  }

  console.log('\n🗑️  Starting deletion process...\n');

  const userIds = nonAdminUsers.map((u) => u.id);
  let deletedCount = 0;
  let errorCount = 0;

  for (const user of nonAdminUsers) {
    try {
      console.log(`Deleting ${user.email}...`);

      // 1. Delete from team_rosters
      await supabase
        .from('team_rosters')
        .delete()
        .eq('player_id', user.id);

      // 2. Delete teams where this user is captain
      await supabase
        .from('teams')
        .delete()
        .eq('captain_id', user.id);

      // 3. Delete match_stats
      await supabase
        .from('match_stats')
        .delete()
        .eq('player_id', user.id);

      // 4. Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error(`  ❌ Error deleting profile: ${profileError.message}`);
        errorCount++;
        continue;
      }

      // 5. Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        console.error(`  ❌ Error deleting auth user: ${authError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Deleted successfully`);
      deletedCount++;
    } catch (err: any) {
      console.error(`  ❌ Unexpected error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Deletion Summary:');
  console.log(`   ✅ Successfully deleted: ${deletedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${nonAdminUsers.length}\n`);

  // Show remaining users
  const { data: remainingUsers } = await supabase
    .from('profiles')
    .select('id, email, psn_id, role')
    .order('created_at', { ascending: true });

  console.log('👥 Remaining users:');
  remainingUsers?.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email} (${user.psn_id || 'No PSN'}) - Role: ${user.role}`);
  });

  console.log('\n✅ Done!');
}

deleteNonAdminUsers().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
