# KPL 스크립트 모음

## 테스트 사용자 생성

### 사전 준비

1. **Service Role Key 확인**
   - Supabase Dashboard → Settings → API
   - `service_role` 키 복사 (secret!)

2. **환경변수 설정**
   `.env.local` 파일에 추가:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **tsx 설치** (아직 없다면)
   ```bash
   npm install --save-dev tsx
   ```

### 실행 방법

```bash
npx tsx scripts/create-test-users.ts
```

### 결과

- 100명의 테스트 사용자 생성
- 이메일: `testuser001@kpl.test` ~ `testuser100@kpl.test`
- 비밀번호: `Test1234!` (모든 사용자 공통)
- PSN ID: `KPL_Player_001` ~ `KPL_Player_100`
- 역할: `user` (일반 사용자)

### 주의사항

⚠️ **Service Role Key는 절대 Git에 커밋하지 마세요!**
- `.env.local`은 이미 `.gitignore`에 포함되어 있습니다
- 프로덕션 환경에서는 환경변수로 안전하게 관리하세요

### 생성된 사용자로 로그인 테스트

1. 로그인 페이지에서 아무 테스트 계정이나 사용:
   - 이메일: `testuser001@kpl.test`
   - 비밀번호: `Test1234!`

2. 또는:
   - 이메일: `testuser042@kpl.test`
   - 비밀번호: `Test1234!`

모든 테스트 계정은 동일한 비밀번호를 사용합니다.
