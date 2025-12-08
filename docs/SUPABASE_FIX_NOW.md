# 🚨 지금 바로 수정하세요! - Supabase 설정

## 현재 상황
- ❌ Google 로그인 후 `http://localhost:3000`으로 리디렉션됨
- ✅ Vercel 배포 URL: `https://kplv2.vercel.app`

## ⚡ 3분 안에 해결하기

### 1단계: Supabase Dashboard 접속
```
https://app.supabase.com
```
로그인 후 KPL 프로젝트 선택

### 2단계: URL Configuration 메뉴로 이동
1. 왼쪽 사이드바: **Authentication** 클릭
2. 상단 탭: **URL Configuration** 클릭

### 3단계: Site URL 변경 (가장 중요!)

**현재 값 (잘못됨):**
```
http://localhost:3000
```

**변경할 값:**
```
https://kplv2.vercel.app
```

이 필드 하나만 바꾸면 됩니다!

### 4단계: Redirect URLs 추가

**Redirect URLs** 섹션에 다음 2개 추가:

```
http://localhost:3000/**
https://kplv2.vercel.app/**
```

⚠️ 끝에 `/**` 반드시 포함!

### 5단계: 저장
**Save** 버튼 클릭

---

## 📸 정확한 설정 화면

```
┌───────────────────────────────────────────────────────┐
│ Authentication > URL Configuration                     │
├───────────────────────────────────────────────────────┤
│                                                         │
│ Site URL                                                │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ https://kplv2.vercel.app                  ← 여기! ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                         │
│ Redirect URLs                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ http://localhost:3000/**                         │   │
│ │ https://kplv2.vercel.app/**                      │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│                                              [Save]     │
└───────────────────────────────────────────────────────┘
```

---

## ✅ 설정 완료 후 테스트

### 1. 브라우저 시크릿 모드 열기
Ctrl + Shift + N (Chrome) / Ctrl + Shift + P (Firefox)

### 2. Vercel URL 접속
```
https://kplv2.vercel.app
```

### 3. Google 로그인 시도
"Google로 로그인" 버튼 클릭

### 4. 성공 확인
✅ `https://kplv2.vercel.app/?code=...`로 리디렉션되어야 함
❌ `http://localhost:3000`으로 가면 설정 실패

---

## 🔍 설정이 제대로 되었는지 확인

### Supabase에서 확인:
1. Authentication → URL Configuration
2. Site URL이 `https://kplv2.vercel.app`인지 확인
3. Redirect URLs에 두 URL 모두 있는지 확인

### Chrome DevTools로 확인:
1. F12 → Network 탭
2. Google 로그인 실행
3. `callback` 요청 찾기
4. `redirect_to` 파라미터 확인:
   ```
   redirect_to: https://kplv2.vercel.app  ← 이렇게 나와야 함
   ```

---

## 📋 체크리스트

- [ ] Supabase Dashboard → Authentication → URL Configuration 접속
- [ ] Site URL을 `https://kplv2.vercel.app`로 변경
- [ ] Redirect URLs에 `http://localhost:3000/**` 추가
- [ ] Redirect URLs에 `https://kplv2.vercel.app/**` 추가
- [ ] Save 버튼 클릭
- [ ] 시크릿 모드에서 Google 로그인 테스트
- [ ] Vercel URL로 정상 리디렉션 확인

---

## 💡 추가 정보

### localhost도 계속 작동합니다
- Redirect URLs에 localhost가 포함되어 있으므로
- 로컬 개발 시에도 정상 작동
- Site URL은 **기본값**일 뿐, 둘 다 허용됨

### 왜 이런 문제가 발생했나?
- Supabase 프로젝트 생성 시 기본값이 `http://localhost:3000`
- 배포 시 이것을 프로덕션 URL로 변경하지 않음
- Google OAuth는 Supabase의 Site URL을 따라감

### 다른 도메인 추가 시
커스텀 도메인 연결 시:
```
Site URL: https://your-custom-domain.com
Redirect URLs:
  - http://localhost:3000/**
  - https://kplv2.vercel.app/**
  - https://your-custom-domain.com/**
```

---

## 🆘 그래도 안 되면?

### 1. 브라우저 캐시 삭제
```
Chrome: Ctrl + Shift + Delete → 전체 삭제
```

### 2. Supabase 로그 확인
```
Supabase Dashboard → Logs → Auth Logs
→ 최근 로그인 시도의 redirect_to 값 확인
```

### 3. Google OAuth 재설정
Google Cloud Console에서:
- 승인된 리디렉션 URI에 다음 추가:
  ```
  https://euopxjqyefbtizvkhhpp.supabase.co/auth/v1/callback
  ```

---

## ✅ 완료되면

설정 완료 후:
1. 프로덕션(Vercel)에서 Google 로그인 ✅
2. 로컬(localhost)에서 Google 로그인 ✅
3. 이메일 인증 링크도 정상 작동 ✅

모두 작동합니다!
