# Supabase 설정 가이드

KPL 시스템을 실행하기 위한 Supabase 설정 단계입니다.

## 1. Database Migrations 실행

### 1단계: Schema 업데이트 (기존 테이블 수정)
1. Supabase Dashboard → SQL Editor로 이동
2. `supabase/schema_updates.sql` 파일의 내용을 복사
3. SQL Editor에 붙여넣고 실행

### 2단계: Team Requests 테이블 생성
1. SQL Editor 새 쿼리 열기
2. `supabase/migrations/001_team_requests.sql` 파일의 내용을 복사
3. 붙여넣고 실행

### 3단계: Matches 테이블 업데이트
1. SQL Editor 새 쿼리 열기
2. `supabase/migrations/002_matches_updates.sql` 파일의 내용을 복사
3. 붙여넣고 실행

### 4단계: 더미 데이터 로드 (선택사항)
1. SQL Editor 새 쿼리 열기
2. `supabase/dummy_data_v2.sql` 파일의 내용을 복사
3. 붙여넣고 실행
4. **주의**: 기존 데이터가 삭제될 수 있습니다 (DELETE 문 포함)

---

## 2. Email Provider 활성화

### Google OAuth는 이미 설정되어 있다고 가정하고, Email Provider를 추가합니다:

1. Supabase Dashboard → **Authentication** → **Providers** 메뉴로 이동

2. **Email** Provider 찾기

3. **Enable Email provider** 토글을 켜기

4. Email 템플릿 설정 (선택사항, 한국어로 커스터마이징)

### Confirm Email Template (확인 이메일)
```
Subject: Korea Proam League 이메일 인증

안녕하세요,

Korea Proam League에 가입해 주셔서 감사합니다.
아래 링크를 클릭하여 이메일 인증을 완료해주세요:

{{ .ConfirmationURL }}

감사합니다.
KPL 운영팀
```

### Reset Password Template (비밀번호 재설정)
```
Subject: Korea Proam League 비밀번호 재설정

안녕하세요,

비밀번호 재설정을 요청하셨습니다.
아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:

{{ .ConfirmationURL }}

요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.

감사합니다.
KPL 운영팀
```

5. **Site URL** 설정:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`

6. **Redirect URLs** 설정 (Add URL 버튼 클릭):
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`
   - Production URLs도 추가

7. **저장** 클릭

---

## 3. Storage Bucket 생성 (팀 로고용)

1. Supabase Dashboard → **Storage** 메뉴로 이동

2. **Create a new bucket** 클릭

3. Bucket 설정:
   - Name: `team-logos`
   - Public bucket: ✅ 체크
   - File size limit: `2MB` (2097152 bytes)
   - Allowed MIME types: `image/png, image/jpeg, image/jpg, image/webp`

4. **Create bucket** 클릭

5. **Policies** 탭으로 이동하여 RLS 정책 설정:

#### Policy 1: Public Read
```sql
CREATE POLICY "Anyone can view team logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');
```

#### Policy 2: Authenticated Upload
```sql
CREATE POLICY "Authenticated users can upload team logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-logos' AND
  auth.role() = 'authenticated'
);
```

#### Policy 3: Admin Delete
```sql
CREATE POLICY "Admins can delete team logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 4. 환경 변수 설정

로컬 개발 환경에서 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**값 찾는 방법:**
1. Supabase Dashboard → **Project Settings** → **API**
2. **Project URL** 복사 → `NEXT_PUBLIC_SUPABASE_URL`
3. **Project API keys** → **anon public** 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 5. 첫 Admin 계정 설정

### 5-1. Google 계정으로 로그인
1. 로컬에서 개발 서버 실행: `npm run dev`
2. `http://localhost:3000/auth/signin` 접속
3. Google 탭에서 로그인
4. PSN_ID 입력 후 프로필 생성

### 5-2. Admin 권한 부여
1. Supabase Dashboard → **SQL Editor**
2. 다음 쿼리 실행 (이메일 주소를 본인 것으로 변경):

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@gmail.com';
```

3. 확인:
```sql
SELECT id, email, psn_id, role FROM profiles WHERE email = 'your-email@gmail.com';
```

---

## 6. 테스트

### 6-1. Google OAuth 로그인 테스트
- `/auth/signin` → Google 탭 → 로그인
- PSN_ID 입력
- 홈으로 리다이렉트

### 6-2. Email 회원가입 테스트
- `/auth/signup` 접속
- 이메일, 비밀번호 입력 (비밀번호 요구사항 확인)
- 가입 완료 후 이메일 확인
- 이메일의 인증 링크 클릭
- PSN_ID 입력
- 로그인 성공

### 6-3. 비밀번호 재설정 테스트
- `/auth/signin` → Forgot Password 클릭
- 이메일 입력
- 이메일 수신 확인
- 재설정 링크 클릭
- 새 비밀번호 설정
- 로그인 테스트

### 6-4. Admin 기능 테스트
- Admin 계정으로 로그인 후
- `/admin` 접속 (예정 - 아직 구현 안됨)
- 팀 관리, 시즌 관리 등 테스트

---

## 7. Production 배포 (Vercel)

### 7-1. Vercel 프로젝트 설정
1. GitHub에 코드 push
2. Vercel Dashboard에서 프로젝트 import
3. Framework Preset: **Next.js** 자동 감지
4. Build Command: `npm run build` (기본값)
5. Output Directory: `.next` (기본값)

### 7-2. 환경 변수 설정 (Vercel)
1. Vercel 프로젝트 → **Settings** → **Environment Variables**
2. 다음 변수들 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase Anon Key
3. **Save** 클릭

### 7-3. Supabase Redirect URLs 업데이트
1. Production URL 확인 (예: `https://kpl-league.vercel.app`)
2. Supabase Dashboard → **Authentication** → **URL Configuration**
3. **Redirect URLs**에 추가:
   - `https://your-domain.vercel.app/auth/callback`
   - `https://your-domain.vercel.app/auth/reset-password`

### 7-4. 배포
1. Vercel에서 자동 배포
2. 배포 완료 후 production URL 접속
3. 로그인 테스트

---

## 8. 문제 해결

### 문제 1: "Email provider is not enabled" 오류
**해결**: Supabase Authentication → Providers → Email 활성화 확인

### 문제 2: 인증 이메일이 안 옴
**해결**:
- Supabase Dashboard → Authentication → Email Templates 확인
- 스팸 폴더 확인
- Supabase 프로젝트 설정에서 SMTP 설정 (선택사항)

### 문제 3: Redirect URL 오류
**해결**:
- Supabase Authentication → URL Configuration
- Redirect URLs에 현재 도메인 추가 확인

### 문제 4: Database migration 실행 실패
**해결**:
- 순서대로 실행했는지 확인
- 기존 테이블/컬럼이 있는지 확인 (`IF NOT EXISTS` 사용됨)
- 에러 메시지 확인 후 수동 수정

---

## 완료!

모든 설정이 완료되었습니다. 이제 KPL 시스템을 사용할 수 있습니다.

다음 단계:
1. ✅ Database migrations 실행
2. ✅ Email provider 활성화
3. ✅ Storage bucket 생성
4. ✅ 환경 변수 설정
5. ✅ Admin 계정 설정
6. ✅ 테스트
7. ⏳ Admin Dashboard 구현 (PHASE 3)
8. ⏳ Team Registration 구현 (PHASE 4)
9. ⏳ Schedule Table 구현 (PHASE 5)

필요한 경우 이 문서를 참고하여 추가 설정을 진행하세요.
