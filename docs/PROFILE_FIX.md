# Profile 자동 생성 문제 해결

## 🔴 문제

Google 로그인 후 팀 생성 신청 시 다음 오류 발생:
```
신청 실패: insert or update on table "team_requests" violates foreign key constraint "team_requests_requester_id_fkey"
```

**원인:**
- 사용자가 로그인했지만 `profiles` 테이블에 레코드가 없음
- `team_requests.requester_id`가 `profiles.id`를 참조하는데 해당 profile이 없음

---

## ✅ 해결 방법

### 1단계: 트리거 설치 (미래 사용자용)

**Supabase Dashboard → SQL Editor**에서 다음 파일 실행:

**파일:** `supabase/migrations/003_auto_create_profile.sql`

이 트리거는:
- 새 사용자가 가입할 때 자동으로 profile 생성
- Google OAuth, Email 로그인 모두 지원
- 기본 role은 'user'로 설정

### 2단계: 기존 사용자 수정 (현재 사용자용)

**Supabase Dashboard → SQL Editor**에서 다음 파일 실행:

**파일:** `supabase/fix_missing_profiles.sql`

이 스크립트는:
- `auth.users`에는 있지만 `profiles`에 없는 사용자 찾기
- 자동으로 profile 생성
- 생성된 profile 개수 표시

---

## 📝 실행 순서

### Supabase SQL Editor에서:

```sql
-- 1. 먼저 트리거 설치 (한 번만 실행)
-- 파일 내용: supabase/migrations/003_auto_create_profile.sql
-- 복사 → 붙여넣기 → Run

-- 2. 기존 사용자 profile 생성
-- 파일 내용: supabase/fix_missing_profiles.sql
-- 복사 → 붙여넣기 → Run
```

---

## 🧪 확인 방법

### 1. Profile이 생성되었는지 확인:

```sql
SELECT
  au.id,
  au.email,
  p.psn_id,
  p.role,
  p.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'your-email@example.com';
```

### 2. 트리거가 작동하는지 테스트:

1. 새 Google 계정으로 로그인
2. 다음 쿼리 실행:
   ```sql
   SELECT * FROM profiles WHERE email = 'new-user@example.com';
   ```
3. Profile이 자동으로 생성되었는지 확인

---

## 🔧 수동으로 Profile 생성 (임시 방법)

만약 SQL Editor를 사용할 수 없다면, 다음 스크립트를 로컬에서 실행:

```bash
npx tsx scripts/create-missing-profiles.ts
```

*참고: 이 스크립트는 아직 만들지 않았습니다. 필요하면 요청하세요.*

---

## 📌 중요 참고사항

### Profile 자동 생성 로직:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### PSN ID는?

- Profile은 생성되지만 `psn_id`는 NULL
- 사용자가 처음 로그인 후 프로필 설정 페이지에서 입력
- 또는 관리자가 수동으로 설정

---

## ⚠️ 주의사항

1. **트리거는 한 번만 실행하세요**
   - 이미 실행했다면 다시 실행하지 마세요
   - `DROP TRIGGER IF EXISTS`가 있어서 안전하지만 불필요

2. **Service Role Key 필요**
   - 트리거 함수는 `SECURITY DEFINER`로 실행됨
   - Supabase가 자동으로 권한 관리

3. **RLS (Row Level Security)**
   - 사용자는 자신의 profile만 읽기/쓰기 가능
   - 다른 사용자 profile은 읽기만 가능

---

## ✅ 완료 후 확인

1. Google 로그인 성공
2. Profile 자동 생성 확인
3. 팀 생성 신청 가능
4. 에러 없이 정상 작동

---

## 📞 추가 도움

문제가 계속되면:
1. Supabase Dashboard → Authentication → Users 확인
2. SQL Editor에서 다음 실행:
   ```sql
   SELECT COUNT(*) FROM auth.users;
   SELECT COUNT(*) FROM profiles;
   ```
3. 두 숫자가 같아야 함
