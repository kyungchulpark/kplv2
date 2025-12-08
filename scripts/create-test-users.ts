/**
 * 테스트 사용자 100명 생성 스크립트
 *
 * 실행 방법:
 * 1. .env.local 파일에 SUPABASE_SERVICE_ROLE_KEY 추가 필요
 * 2. npm install --save-dev tsx dotenv (아직 없다면)
 * 3. npx tsx scripts/create-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// .env.local 파일 로드
config({ path: '.env.local' });

// 환경변수에서 Supabase 정보 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  process.exit(1);
}

// Service Role Key로 관리자 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestUsers() {
  console.log('🚀 테스트 사용자 100명 생성 시작...\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= 100; i++) {
    const email = `testuser${String(i).padStart(3, '0')}@kpl.test`;
    const psnId = `KPL_Player_${String(i).padStart(3, '0')}`;
    const password = 'Test1234!'; // 모든 테스트 사용자는 같은 비밀번호

    try {
      // 1. Auth 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 이메일 인증 자동 완료
      });

      if (authError) {
        console.error(`❌ [${i}/100] ${email} - Auth 생성 실패:`, authError.message);
        errorCount++;
        continue;
      }

      // 2. Profile 업데이트 (PSN ID 추가)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          psn_id: psnId,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error(`⚠️  [${i}/100] ${email} - Profile 업데이트 실패:`, profileError.message);
        errorCount++;
        continue;
      }

      console.log(`✅ [${i}/100] ${email} (${psnId}) - 생성 완료`);
      successCount++;

      // API Rate Limit 방지를 위한 딜레이 (100ms)
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ [${i}/100] ${email} - 예외 발생:`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ 테스트 사용자 생성 완료!`);
  console.log(`✅ 성공: ${successCount}명`);
  console.log(`❌ 실패: ${errorCount}명`);
  console.log('='.repeat(50));
  console.log('\n📝 로그인 정보:');
  console.log(`   이메일: testuser001@kpl.test ~ testuser100@kpl.test`);
  console.log(`   비밀번호: Test1234!`);
  console.log(`   PSN ID: KPL_Player_001 ~ KPL_Player_100`);
}

// 스크립트 실행
createTestUsers()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  });
