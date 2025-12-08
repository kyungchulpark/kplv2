-- ============================================
-- 테스트 사용자 100명 생성 스크립트
-- ============================================
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요
-- auth.users 테이블에 직접 삽입할 수 없으므로, profiles 테이블에만 생성합니다
-- 실제 인증은 Google OAuth나 Email을 통해 나중에 연결됩니다

-- 임시 UUID 생성 함수 (사용자 ID용)
DO $$
DECLARE
  i INT;
  user_id UUID;
  user_email TEXT;
  user_psn TEXT;
BEGIN
  FOR i IN 1..100 LOOP
    -- UUID 생성
    user_id := gen_random_uuid();

    -- 이메일과 PSN ID 생성
    user_email := 'testuser' || LPAD(i::TEXT, 3, '0') || '@kpl.test';
    user_psn := 'KPL_Player_' || LPAD(i::TEXT, 3, '0');

    -- profiles 테이블에 삽입
    INSERT INTO profiles (
      id,
      email,
      psn_id,
      role,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      user_email,
      user_psn,
      'user', -- 모두 일반 사용자
      NULL,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created user %: % (%)', i, user_email, user_psn;
  END LOOP;

  RAISE NOTICE 'Successfully created 100 test users!';
END $$;

-- 생성된 사용자 확인
SELECT
  COUNT(*) as total_test_users,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM profiles
WHERE email LIKE 'testuser%@kpl.test';

-- 처음 10명 샘플 확인
SELECT
  id,
  email,
  psn_id,
  role,
  created_at
FROM profiles
WHERE email LIKE 'testuser%@kpl.test'
ORDER BY email
LIMIT 10;
