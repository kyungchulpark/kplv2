# 🚨 긴급 수정: Google 로그인 localhost 리디렉션 문제

## 현재 문제
Google 로그인 후 `http://localhost:3000/?code=...`로 리디렉션되어 프로덕션에서 로그인 불가

## ✅ 즉시 해결 방법 (5분 소요)

### 1단계: Vercel 배포 URL 확인
1. https://vercel.com 로그인
2. `kplv2` 프로젝트 클릭
3. **Domains** 섹션에서 URL 확인 (예: `kplv2.vercel.app`)
4. 이 URL을 복사하세요

### 2단계: Supabase Site URL 변경 ⚡ 중요!
1. https://app.supabase.com 접속
2. KPL 프로젝트 선택
3. 왼쪽 메뉴: **Authentication** 클릭
4. 상단 탭: **URL Configuration** 클릭
5. **Site URL** 필드 찾기
6. 현재 값이 `http://localhost:3000`으로 되어 있을 것
7. **이것을 Vercel URL로 변경:**
   ```
   https://kplv2.vercel.app
   ```
   (또는 실제 Vercel 도메인으로)
8. **Save** 버튼 클릭

### 3단계: Redirect URLs 추가
같은 페이지에서 아래로 스크롤:

**Redirect URLs** 섹션:
```
http://localhost:3000/**
https://kplv2.vercel.app/**
```

두 URL 모두 추가하고 **Save**

### 4단계: 즉시 테스트
1. 브라우저 **시크릿 모드** 열기
2. Vercel URL 접속
3. Google 로그인 시도
4. ✅ Vercel URL로 정상 리디렉션 확인

---

## 📸 스크린샷 가이드

### Supabase URL Configuration 화면
```
┌─────────────────────────────────────────────────────┐
│ Authentication > URL Configuration                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Site URL                                              │
│ The URL of your website. Used in magic link emails.  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ https://kplv2.vercel.app                  [변경] │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ Redirect URLs                                         │
│ List of URLs that auth can redirect to after sign in │
│ ┌─────────────────────────────────────────────────┐ │
│ │ http://localhost:3000/**                         │ │
│ │ https://kplv2.vercel.app/**                      │ │
│ │                                      [+ Add URL] │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│                                        [Save] 버튼    │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ 주의사항

### 왜 localhost로 리디렉션될까?
- Supabase는 **Site URL**에 설정된 주소로 기본 리디렉션함
- 현재 `http://localhost:3000`으로 설정되어 있음
- Google 로그인 성공 후 → localhost로 돌아가려 함
- 하지만 프로덕션에서는 localhost가 없으므로 실패

### Site URL vs Redirect URLs 차이
| 설정 | 용도 | 개수 |
|------|------|------|
| **Site URL** | 기본 리디렉션 주소 (중요!) | 1개만 |
| **Redirect URLs** | 허용된 리디렉션 목록 | 여러 개 가능 |

**핵심:** Site URL을 Vercel URL로 바꿔야 함!

---

## 🔍 설정 확인 방법

### Chrome DevTools로 확인
1. F12 → Network 탭
2. Google 로그인 실행
3. Redirect 요청 확인:
   ```
   Request URL: https://euopxjqyefbtizvkhhpp.supabase.co/auth/v1/callback
   Query Params:
     - code: xxxx
     - redirect_to: https://kplv2.vercel.app  ← 여기가 Vercel URL이어야 함
   ```

### Supabase Logs로 확인
1. Supabase Dashboard → Logs → Auth Logs
2. 최근 로그인 시도 확인
3. `redirect_to` 값이 Vercel URL인지 확인

---

## ✅ 완료 체크리스트

- [ ] Vercel 배포 URL 확인함
- [ ] Supabase Site URL을 Vercel URL로 변경함
- [ ] Redirect URLs에 localhost와 Vercel URL 모두 추가함
- [ ] Save 버튼 클릭함
- [ ] 시크릿 모드에서 Google 로그인 테스트 성공

---

## 💡 참고: 실제 설정 예시

### 개발 환경 (로컬)
```
Site URL: https://kplv2.vercel.app  ← 프로덕션 우선
Redirect URLs:
  - http://localhost:3000/**        ← 개발용
  - https://kplv2.vercel.app/**     ← 프로덕션용
```

### 프로덕션 배포 후
- Vercel URL에서 Google 로그인 → Vercel URL로 리디렉션 ✅
- localhost에서 Google 로그인 → localhost로 리디렉션 ✅

둘 다 작동합니다!

---

## 🆘 그래도 안 되면?

### 브라우저 캐시 삭제
```
Chrome: F12 → Application → Clear storage → Clear site data
```

### Google OAuth 재인증
Google 계정 로그아웃 후 재로그인

### Supabase 설정 재확인
```bash
# Supabase CLI로 확인 (설치되어 있다면)
supabase status
```

---

## 📞 추가 지원

더 자세한 내용:
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
