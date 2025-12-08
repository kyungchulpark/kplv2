-- ============================================
-- 모든 사용자 삭제 (개발/테스트용)
-- ============================================
-- ⚠️ 주의: 이 스크립트는 모든 사용자를 삭제합니다!
-- 프로덕션 환경에서는 절대 실행하지 마세요!

-- 1. 먼저 profiles 테이블의 모든 레코드 삭제
DELETE FROM public.profiles;

-- 2. auth.users 테이블의 모든 사용자 삭제
-- Supabase SQL Editor에서는 auth.users를 직접 삭제할 수 없으므로
-- Supabase Dashboard → Authentication → Users에서 수동으로 삭제하거나
-- 아래 방법을 사용하세요

-- 방법 1: Supabase Dashboard 사용
-- Authentication → Users → 각 사용자 옆 ... 메뉴 → Delete User

-- 방법 2: SQL로 삭제 (관리자 권한 필요)
-- 다음 함수를 생성하여 실행:

CREATE OR REPLACE FUNCTION delete_all_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and delete them
  FOR user_record IN SELECT id FROM auth.users LOOP
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
END;
$$;

-- 함수 실행
SELECT delete_all_users();

-- 함수 삭제 (정리)
DROP FUNCTION IF EXISTS delete_all_users();

-- 3. 확인
SELECT COUNT(*) as remaining_users FROM auth.users;
SELECT COUNT(*) as remaining_profiles FROM public.profiles;

-- 결과가 모두 0이면 성공!
