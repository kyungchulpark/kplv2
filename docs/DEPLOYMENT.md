# KPL 배포 가이드

## 📋 목차
1. [Vercel 배포](#vercel-배포)
2. [Supabase 인증 설정](#supabase-인증-설정)
3. [환경변수 설정](#환경변수-설정)
4. [Google OAuth 설정](#google-oauth-설정)

---

## 1. Vercel 배포

### 초기 배포
1. GitHub 저장소 연결됨: `https://github.com/kyungchulpark/kplv2.git`
2. Vercel Dashboard에서 자동 빌드 및 배포 완료
3. 배포 URL 확인 (예: `https://kplv2.vercel.app`)

---

## 2. Supabase 인증 설정

### 🔴 중요: Redirect URLs 설정

**현재 문제:**
- Google 로그인 후 `localhost`로 리디렉션되어 프로덕션에서 오류 발생
- 이메일 인증 링크도 `localhost`로 연결됨

**해결 방법:**

### A. Supabase Dashboard 접속
1. https://app.supabase.com 접속
2. KPL 프로젝트 선택 (`euopxjqyefbtizvkhhpp`)

### B. Redirect URLs 추가
1. **Authentication → URL Configuration** 메뉴로 이동
2. **Site URL** 설정:
   ```
   https://your-vercel-url.vercel.app
   ```
   (실제 Vercel 배포 URL로 변경)

3. **Redirect URLs** 추가:
   ```
   http://localhost:3000/**
   https://your-vercel-url.vercel.app/**
   ```

   ⚠️ 두 URL 모두 필요:
   - `localhost`: 로컬 개발용
   - `vercel.app`: 프로덕션용

### C. 설정 저장
- Save 버튼 클릭
- 변경사항이 즉시 적용됨 (재시작 불필요)

---

## 3. 환경변수 설정

### Vercel 환경변수 설정

1. **Vercel Dashboard → Settings → Environment Variables**

2. **추가할 환경변수:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://euopxjqyefbtizvkhhpp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1b3B4anF5ZWZidGl6dmtoaHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjE1NDMsImV4cCI6MjA4MDM5NzU0M30.Q2UCuO3a_B4TSeWNFT7zpTABKbE7I-9g_A-QrVe6i-s
   ```

3. **Environment 선택:**
   - Production ✅
   - Preview ✅
   - Development ✅
   (모든 환경에 동일하게 적용)

4. **저장 후 재배포:**
   - Deployments 탭 → 최신 배포 → Redeploy

---

## 4. Google OAuth 설정

### A. Google Cloud Console 설정

1. **승인된 리디렉션 URI 추가:**
   - https://console.cloud.google.com
   - APIs & Services → Credentials
   - OAuth 2.0 Client ID 선택
   - **승인된 리디렉션 URI**에 추가:
     ```
     https://euopxjqyefbtizvkhhpp.supabase.co/auth/v1/callback
     ```

### B. Supabase에서 Google Provider 활성화

1. **Supabase Dashboard → Authentication → Providers**
2. **Google** 선택
3. **Enabled** 토글 ON
4. Google Cloud Console에서 가져온 정보 입력:
   - **Client ID**: `your-google-client-id`
   - **Client Secret**: `your-google-client-secret`
5. Save

---

## 📝 설정 확인 체크리스트

### Supabase
- [ ] Site URL이 Vercel URL로 설정됨
- [ ] Redirect URLs에 localhost와 Vercel URL 모두 추가됨
- [ ] Google Provider가 활성화됨

### Vercel
- [ ] 환경변수 2개 추가됨 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] 환경변수 추가 후 재배포 완료

### Google Cloud Console
- [ ] 승인된 리디렉션 URI에 Supabase 콜백 URL 추가됨

---

## 🧪 테스트 방법

### 1. 이메일 로그인 테스트
1. Vercel 배포 URL 접속
2. 테스트 계정으로 로그인:
   - 이메일: `testuser001@kpl.test`
   - 비밀번호: `Test1234!`
3. 로그인 성공 확인

### 2. Google OAuth 테스트
1. "Google로 로그인" 버튼 클릭
2. Google 계정 선택
3. Vercel URL로 정상 리디렉션 확인
4. 프로필 생성 확인

---

## 🔧 문제 해결

### "Redirect URL not allowed" 오류
- **원인**: Supabase Redirect URLs에 현재 도메인이 없음
- **해결**: Supabase Dashboard에서 Redirect URLs 추가

### 환경변수가 적용되지 않음
- **원인**: Vercel에서 환경변수 추가 후 재배포 안 함
- **해결**: Deployments → Redeploy

### Google 로그인 후 localhost로 리디렉션
- **원인**: Supabase Site URL이 localhost로 설정됨
- **해결**: Site URL을 Vercel URL로 변경

---

## 📌 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Vercel 환경변수 가이드](https://vercel.com/docs/environment-variables)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
