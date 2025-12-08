# Supabase 인증 설정 - 스크린샷 가이드

## 🎯 목표
Google 로그인과 이메일 인증이 Vercel 배포 환경에서 정상 작동하도록 설정

---

## 1️⃣ Redirect URLs 설정

### 접속 경로
```
Supabase Dashboard → Authentication → URL Configuration
```

### 설정 항목

#### Site URL
```
https://your-vercel-url.vercel.app
```
📌 Vercel에서 배포된 실제 URL로 변경하세요

#### Redirect URLs
다음 두 URL을 **모두** 추가:
```
http://localhost:3000/**
https://your-vercel-url.vercel.app/**
```

⚠️ **중요**: URL 끝에 `/**`를 꼭 붙이세요!

### 스크린샷 예시
```
┌─────────────────────────────────────────────┐
│ URL Configuration                            │
├─────────────────────────────────────────────┤
│                                              │
│ Site URL                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ https://kplv2.vercel.app                 │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Redirect URLs                                │
│ ┌─────────────────────────────────────────┐ │
│ │ http://localhost:3000/**                 │ │
│ │ https://kplv2.vercel.app/**              │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│                            [Save]             │
└─────────────────────────────────────────────┘
```

---

## 2️⃣ Google OAuth Provider 설정

### 접속 경로
```
Supabase Dashboard → Authentication → Providers
```

### Google Provider 활성화

1. **Google** 항목 클릭
2. **Enabled** 토글을 ON으로 변경

### Authorized Client IDs 확인
```
Callback URL (Authorized redirect URIs)
https://euopxjqyefbtizvkhhpp.supabase.co/auth/v1/callback
```
이 URL을 복사하여 Google Cloud Console에 등록해야 합니다.

---

## 3️⃣ Google Cloud Console 설정

### 접속
https://console.cloud.google.com

### OAuth 2.0 클라이언트 ID 설정

1. **APIs & Services → Credentials** 메뉴
2. 기존 OAuth 2.0 클라이언트 ID 선택 (또는 새로 생성)

### 승인된 JavaScript 원본 추가
```
https://euopxjqyefbtizvkhhpp.supabase.co
https://your-vercel-url.vercel.app
http://localhost:3000
```

### 승인된 리디렉션 URI 추가
```
https://euopxjqyefbtizvkhhpp.supabase.co/auth/v1/callback
https://your-vercel-url.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

### 저장
- **저장** 버튼 클릭
- 변경사항이 몇 분 내로 적용됨

---

## 4️⃣ Vercel 환경변수 설정

### 접속 경로
```
Vercel Dashboard → Your Project → Settings → Environment Variables
```

### 추가할 환경변수

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://euopxjqyefbtizvkhhpp.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (Supabase에서 복사) | Production, Preview, Development |

### 재배포 필수!
환경변수 추가 후 반드시 재배포:
```
Deployments → 최신 배포 → ⋯ → Redeploy
```

---

## ✅ 설정 완료 체크리스트

### Supabase
- [ ] Site URL이 Vercel URL로 설정됨
- [ ] Redirect URLs에 `localhost:3000/**`와 `vercel.app/**` 모두 추가됨
- [ ] Google Provider 활성화됨
- [ ] Callback URL 확인함

### Google Cloud Console
- [ ] 승인된 JavaScript 원본 3개 추가됨
- [ ] 승인된 리디렉션 URI 3개 추가됨
- [ ] 저장 완료

### Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 환경변수 추가됨
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수 추가됨
- [ ] 모든 환경(Production, Preview, Development)에 적용됨
- [ ] 재배포 완료

---

## 🧪 테스트

### 1. 로컬 환경 테스트
```bash
npm run dev
```
- http://localhost:3000 접속
- Google 로그인 테스트
- 이메일 로그인 테스트

### 2. 프로덕션 환경 테스트
- Vercel 배포 URL 접속
- Google 로그인 테스트
- 이메일 로그인 테스트
- **리디렉션이 Vercel URL로 정상 작동하는지 확인**

---

## 🔧 문제 해결

### "Invalid Redirect URL" 오류

**증상:**
```
Invalid Redirect: http://localhost:3000/auth/callback is not allowed
```

**해결:**
1. Supabase Redirect URLs 확인
2. `http://localhost:3000/**` 형식으로 추가 (끝에 `/**` 필수)
3. 저장 후 페이지 새로고침

### Google 로그인 후 localhost로 리디렉션

**증상:**
- 프로덕션에서 Google 로그인 성공
- 그러나 `http://localhost:3000`으로 리디렉션됨
- 404 또는 연결 오류 발생

**해결:**
1. Supabase **Site URL**을 Vercel URL로 변경
2. 브라우저 캐시 삭제
3. 시크릿 모드에서 재테스트

### 환경변수 적용 안 됨

**증상:**
- Vercel에서 Supabase 연결 실패
- Console에 "Supabase client error" 표시

**해결:**
1. Vercel → Settings → Environment Variables 확인
2. 모든 환경(Production/Preview/Development) 체크 확인
3. **반드시 재배포** (Deployments → Redeploy)

---

## 📌 중요 참고사항

### Site URL vs Redirect URLs 차이

**Site URL:**
- 인증 후 **기본으로 돌아갈 주소**
- 프로덕션 URL을 설정해야 함
- 1개만 설정 가능

**Redirect URLs:**
- 인증 콜백을 **허용할 모든 URL 목록**
- 여러 개 설정 가능
- 로컬/프로덕션 모두 추가

### 와일드카드 사용

✅ **올바른 사용:**
```
https://kplv2.vercel.app/**
```

❌ **잘못된 사용:**
```
https://kplv2.vercel.app
https://*.vercel.app/**  (와일드카드 도메인 불가)
```

### Vercel Preview 배포

Preview 배포도 지원하려면:
```
https://kplv2-*.vercel.app/**
```
형식은 지원되지 않으므로, 각 Preview URL을 개별 추가하거나,
Preview 환경에서는 localhost를 사용하도록 설정하세요.

---

## 📞 추가 도움

더 자세한 정보는 공식 문서 참고:
- [Supabase Auth 설정](https://supabase.com/docs/guides/auth/redirect-urls)
- [Google OAuth 설정](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel 환경변수](https://vercel.com/docs/projects/environment-variables)
