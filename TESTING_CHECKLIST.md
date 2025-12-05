# KPL Testing Checklist

## 📋 Overview

This document provides a comprehensive testing checklist for the KPL system before production deployment.

**Testing Date**: _____________
**Tester**: _____________
**Environment**: □ Local □ Staging □ Production

---

## 🔐 1. Authentication Tests

### Email/Password Authentication
- [ ] **회원가입**
  - [ ] 이메일 형식 검증
  - [ ] 비밀번호 강도 검증 (6자 이상)
  - [ ] PSN_ID 중복 검사
  - [ ] 회원가입 성공 후 이메일 인증 발송
  - [ ] 이메일 인증 완료 시 로그인 가능

- [ ] **로그인**
  - [ ] 올바른 이메일/비밀번호로 로그인 성공
  - [ ] 잘못된 비밀번호로 로그인 실패
  - [ ] 존재하지 않는 이메일로 로그인 실패
  - [ ] 로그인 후 네비게이션 바에 사용자 정보 표시

- [ ] **비밀번호 재설정**
  - [ ] 비밀번호 찾기 이메일 발송
  - [ ] 재설정 링크 클릭 시 새 비밀번호 입력 페이지 이동
  - [ ] 새 비밀번호로 로그인 성공

### Google OAuth
- [ ] **소셜 로그인**
  - [ ] Google 로그인 버튼 클릭 시 OAuth 팝업
  - [ ] Google 계정 선택 및 권한 승인
  - [ ] 최초 로그인 시 PSN_ID 설정 페이지 이동
  - [ ] PSN_ID 설정 후 메인 페이지 이동
  - [ ] 재로그인 시 PSN_ID 설정 없이 바로 로그인

### Profile Management
- [ ] **프로필 조회**
  - [ ] `/profile` 페이지에서 사용자 정보 확인
  - [ ] PSN_ID, 이메일, 가입일 표시

- [ ] **프로필 수정**
  - [ ] PSN_ID 변경 가능 (중복 검사)
  - [ ] 아바타 이미지 업로드 (Supabase Storage)
  - [ ] 변경 사항 저장 후 즉시 반영

---

## 👥 2. Team Creation & Requests

### User - Team Creation
- [ ] **팀 생성 신청** (`/teams/create`)
  - [ ] 팀 이름 입력 (중복 검사)
  - [ ] 컨퍼런스 선택 (West/East)
  - [ ] 로고 업로드 (2MB 제한, 이미지 타입만)
  - [ ] 로고 미리보기 표시
  - [ ] 신청 제출 시 toast 알림
  - [ ] 신청 후 `/teams/my-requests`로 리다이렉트

- [ ] **내 신청 조회** (`/teams/my-requests`)
  - [ ] 신청한 팀 목록 표시
  - [ ] 상태별 배지 (Pending, Approved, Rejected)
  - [ ] 거부된 경우 사유 표시
  - [ ] 승인된 경우 승인자 및 일시 표시

### Admin - Team Request Management
- [ ] **신청 목록 조회** (`/admin/team-requests`)
  - [ ] Pending, Approved, Rejected 탭 전환
  - [ ] 각 신청의 상세 정보 표시 (신청자, 로고, 컨퍼런스)
  - [ ] 신청 개수 표시

- [ ] **팀 승인**
  - [ ] Approve 버튼 클릭 시 확인 다이얼로그
  - [ ] 승인 시 teams 테이블에 새 팀 생성
  - [ ] 신청자가 captain_id로 설정
  - [ ] team_requests 상태가 'approved'로 변경
  - [ ] reviewed_by, reviewed_at 기록
  - [ ] 승인 후 toast 알림

- [ ] **팀 거부**
  - [ ] Reject 버튼 클릭 시 사유 입력 다이얼로그
  - [ ] 사유 미입력 시 제출 불가
  - [ ] 거부 시 team_requests 상태 'rejected'
  - [ ] rejection_reason 저장
  - [ ] reviewed_by, reviewed_at 기록
  - [ ] 거부 후 toast 알림

---

## 🏀 3. Admin Dashboard

### Seasons Management
- [ ] **시즌 목록** (`/admin/seasons`)
  - [ ] 모든 시즌 카드 형식 표시
  - [ ] 활성 시즌에 빨간 테두리 + "Active" 배지
  - [ ] 시작일, 종료일, Playoff Cutoff 표시

- [ ] **시즌 생성**
  - [ ] "New Season" 버튼 클릭 시 다이얼로그
  - [ ] 시즌 이름, 버전, 시작일, 종료일, Playoff Cutoff 입력
  - [ ] 필수 항목 누락 시 제출 불가
  - [ ] 생성 후 toast 알림 및 페이지 새로고침
  - [ ] 새 시즌이 목록에 표시

- [ ] **시즌 수정**
  - [ ] Edit 버튼 클릭 시 기존 데이터 로드
  - [ ] 정보 수정 후 저장
  - [ ] 수정 후 toast 알림
  - [ ] 변경 사항 즉시 반영

- [ ] **시즌 활성화**
  - [ ] 비활성 시즌의 Activate 버튼 클릭
  - [ ] 기존 활성 시즌 비활성화
  - [ ] 선택한 시즌 활성화
  - [ ] Active 배지 이동 확인

### Teams Management
- [ ] **팀 목록** (`/admin/teams`)
  - [ ] 활성 시즌의 모든 팀 테이블 표시
  - [ ] 로고, 이름, 컨퍼런스, W-L, Win%, 로스터 수, 주장 표시
  - [ ] West는 파란색, East는 빨간색 배지

- [ ] **팀 생성**
  - [ ] "Add Team" 버튼 클릭 시 다이얼로그
  - [ ] 팀 이름, 컨퍼런스, 주장, 로고 입력
  - [ ] 로고 업로드 (2MB, 이미지만)
  - [ ] 주장 드롭다운에서 선택 (profiles 목록)
  - [ ] 생성 후 W-L 0-0, 점수 0으로 초기화
  - [ ] 생성 후 toast 알림

- [ ] **팀 수정**
  - [ ] Edit 버튼 클릭 시 기존 데이터 로드
  - [ ] 팀 이름, 컨퍼런스, 주장, 로고 수정
  - [ ] W-L, 점수는 수정 불가 (경기 결과로만 변경)
  - [ ] 수정 후 toast 알림

- [ ] **팀 삭제**
  - [ ] Delete 버튼 클릭 시 확인 다이얼로그
  - [ ] 삭제 시 관련 데이터 cascade 삭제 (rosters, matches)
  - [ ] 삭제 후 toast 알림

### Matches Management
- [ ] **경기 목록** (`/admin/matches`)
  - [ ] 활성 시즌의 모든 경기 테이블 표시
  - [ ] 날짜/시간, 매치업, 상태, 점수, 시퀀스 표시
  - [ ] 최신 경기가 위에 (날짜 내림차순)

- [ ] **경기 생성**
  - [ ] "Add Match" 버튼 클릭 시 다이얼로그
  - [ ] 날짜, 시간 (22:40/23:20 또는 직접 입력)
  - [ ] 홈팀/어웨이팀 선택 (활성 시즌 팀만)
  - [ ] 상태 (scheduled, live, finished, cancelled)
  - [ ] Finished 선택 시 점수 입력 필드 표시
  - [ ] Match Sequence (YYYYMMDD_XXX 형식)
  - [ ] 게임 비밀번호 (선택)
  - [ ] 생성 후 toast 알림

- [ ] **경기 수정**
  - [ ] Edit 버튼 클릭 시 기존 데이터 로드
  - [ ] 날짜, 시간, 팀, 상태, 점수 수정
  - [ ] 수정 후 toast 알림

- [ ] **경기 삭제**
  - [ ] Delete 버튼 클릭 시 확인
  - [ ] 삭제 후 toast 알림

---

## 📊 4. Excel Schedule Upload

### Template Download
- [ ] **템플릿 다운로드** (`/admin/upload-schedule`)
  - [ ] "Download Template" 버튼 클릭
  - [ ] Excel 파일 다운로드 (kpl_schedule_template.xlsx)
  - [ ] 10개 샘플 경기 포함 (같은 날짜)
  - [ ] 필수 컬럼: match_sequence, match_date, home_team, away_team, match_time, game_password

### File Upload & Parsing
- [ ] **파일 선택**
  - [ ] 드래그 앤 드롭으로 파일 업로드
  - [ ] 또는 클릭하여 파일 선택
  - [ ] 파일 크기 표시
  - [ ] xlsx, csv 파일만 허용

- [ ] **파일 파싱**
  - [ ] "Parse File" 버튼 클릭
  - [ ] 시트 선택 드롭다운 (여러 시트 있을 경우)
  - [ ] 파싱 성공 시 미리보기 테이블 표시
  - [ ] 파싱된 경기 개수 표시

### Validation
- [ ] **데이터 검증**
  - [ ] 필수 컬럼 누락 시 에러 메시지
  - [ ] 팀 이름이 활성 시즌에 없으면 에러
  - [ ] 날짜 형식 오류 (YYYY-MM-DD) 시 에러
  - [ ] 시간 형식 오류 (HH:MM) 시 에러
  - [ ] Match Sequence 중복 시 에러
  - [ ] 에러 목록을 빨간색으로 표시

- [ ] **다중 경기 (같은 날짜)**
  - [ ] 같은 날짜에 10개 경기 업로드 가능
  - [ ] 각 경기에 고유한 match_sequence 부여
  - [ ] 시간대별로 정렬 (22:40 → 23:20)

### Bulk Insert
- [ ] **일괄 등록**
  - [ ] 검증 통과 후 "Upload All" 버튼 활성화
  - [ ] 버튼 클릭 시 모든 경기 matches 테이블에 삽입
  - [ ] 업로드 진행 상태 표시
  - [ ] 성공 시 등록된 경기 개수 표시
  - [ ] 성공 후 toast 알림
  - [ ] 실패 시 에러 메시지

---

## 📅 5. Schedule Table (Public View)

### Display & Navigation
- [ ] **경기 일정 테이블** (`/schedule`)
  - [ ] 날짜별 그룹화 (EEEE, MMM d 형식)
  - [ ] 각 날짜의 경기 개수 표시
  - [ ] 최신 날짜가 위에 표시

- [ ] **경기 정보**
  - [ ] 시간 (HH:mm)
  - [ ] 홈팀 vs 어웨이팀
  - [ ] 팀 로고 또는 약자 표시
  - [ ] 상태 배지 (예정, LIVE, 종료, 취소)
  - [ ] Finished 경기는 점수 표시
  - [ ] Match Sequence (작게)

- [ ] **필터링**
  - [ ] "이전 경기 숨기기" 토글
  - [ ] 토글 시 오늘 이전 경기 숨김
  - [ ] 토글 해제 시 모든 경기 표시

- [ ] **상세보기**
  - [ ] 경기 클릭 시 MatchDetailDialog 오픈
  - [ ] 다이얼로그에서 경기 상세 정보 표시

### Responsive Design
- [ ] **모바일 대응**
  - [ ] 모바일에서 테이블 스크롤 가능
  - [ ] Match Sequence는 태블릿 이상에서만 표시
  - [ ] 팀 이름 줄바꿈 방지

---

## 🎨 6. NBA.com Theme

### Color Consistency
- [ ] **전역 색상**
  - [ ] Primary: NBA Red (#CE1141)
  - [ ] Secondary: NBA Blue (#1D428A)
  - [ ] Accent: NBA Gold (#FDB927)
  - [ ] Background: Pure Black (#000000) in dark mode
  - [ ] Text: White (#FFFFFF) in dark mode

- [ ] **컴포넌트 스타일**
  - [ ] Navbar: 검정 배경, NBA Red 로고
  - [ ] Footer: 검정 배경, NBA Red 로고
  - [ ] Hero Section: 검정 배경, NBA Red 강조
  - [ ] Team placeholders: NBA Red 배경
  - [ ] 배지: West는 파란색, East는 빨간색

- [ ] **그라데이션 제거 확인**
  - [ ] 모든 페이지에서 파랑-보라 그라데이션 없음
  - [ ] 제목은 단색 (그라데이션 텍스트 없음)

### Visual Similarity
- [ ] **NBA.com 느낌**
  - [ ] 깔끔하고 미니멀한 디자인
  - [ ] 충분한 여백 (spacing)
  - [ ] 명확한 타이포그래피 계층
  - [ ] 통일된 아이콘 스타일 (Lucide React)

---

## 📱 7. Responsive Design

### Desktop (1920px+)
- [ ] 모든 페이지 정상 표시
- [ ] 테이블 전체 너비 사용
- [ ] 사이드바 고정 (admin)

### Tablet (768px - 1919px)
- [ ] 테이블 스크롤 가능
- [ ] 그리드 레이아웃 조정 (3열 → 2열)
- [ ] Match Sequence 표시

### Mobile (< 768px)
- [ ] 네비게이션 햄버거 메뉴
- [ ] 테이블 가로 스크롤
- [ ] 그리드 1열
- [ ] Match Sequence 숨김
- [ ] 터치 친화적 버튼 크기

---

## 🔒 8. Security & Permissions

### Row Level Security (RLS)
- [ ] **Profiles**
  - [ ] 자신의 프로필만 수정 가능
  - [ ] 모든 프로필 조회 가능

- [ ] **Seasons**
  - [ ] 모두 조회 가능
  - [ ] Admin만 생성/수정/삭제

- [ ] **Teams**
  - [ ] 모두 조회 가능
  - [ ] Admin만 생성/수정/삭제

- [ ] **Team Requests**
  - [ ] 모두 조회 가능
  - [ ] 인증 사용자만 생성
  - [ ] 자신의 요청만 수정
  - [ ] Admin만 승인/거부

- [ ] **Matches**
  - [ ] 모두 조회 가능
  - [ ] Admin/Staff만 생성/수정/삭제

### Storage Policies
- [ ] **team-logos 버킷**
  - [ ] 모두 읽기 가능 (public)
  - [ ] 인증 사용자만 업로드
  - [ ] 자신의 파일만 수정
  - [ ] Admin만 삭제

### Access Control
- [ ] **Admin Routes**
  - [ ] `/admin/*` 경로는 admin 역할만 접근
  - [ ] 비admin 접근 시 403 또는 리다이렉트

---

## ⚡ 9. Performance

### Page Load
- [ ] 메인 페이지 < 2초
- [ ] Admin 페이지 < 3초
- [ ] 이미지 lazy loading

### Data Fetching
- [ ] Server Components로 초기 데이터 로드
- [ ] 불필요한 리렌더링 없음
- [ ] 적절한 캐싱

### File Upload
- [ ] 2MB 이미지 업로드 < 5초
- [ ] Excel 파싱 (100행) < 3초

---

## 🐛 10. Error Handling

### User Feedback
- [ ] 모든 CRUD 성공 시 toast 알림
- [ ] 모든 에러 시 toast 알림
- [ ] 로딩 상태 표시 (버튼 disable, 스피너)
- [ ] 폼 검증 에러 메시지

### Network Errors
- [ ] Supabase 연결 실패 시 에러 메시지
- [ ] 타임아웃 처리
- [ ] 재시도 메커니즘

### Edge Cases
- [ ] 빈 데이터 (팀 없음, 경기 없음)
- [ ] 매우 긴 팀 이름 (줄바꿈)
- [ ] 특수 문자 입력
- [ ] 동시 수정 (optimistic locking)

---

## ✅ 11. Final Checks

### Documentation
- [ ] README.md 최신 상태
- [ ] SUPABASE_SETUP.md 정확함
- [ ] STORAGE_SETUP.md 정확함
- [ ] API 문서 (필요 시)

### Environment
- [ ] `.env.local` 설정 완료
- [ ] Supabase URL/Key 정확
- [ ] Storage 버킷 생성
- [ ] RLS 정책 적용

### Database
- [ ] 모든 마이그레이션 실행
- [ ] 더미 데이터 로드 (테스트용)
- [ ] Admin 계정 생성

### Deployment
- [ ] Build 성공 (`npm run build`)
- [ ] 프로덕션 환경 변수 설정
- [ ] Vercel 배포 성공
- [ ] 프로덕션에서 모든 기능 동작

---

## 📝 Test Results Summary

**Total Tests**: ___ / ___
**Passed**: ___
**Failed**: ___
**Blocked**: ___

**Critical Issues**:
1.
2.
3.

**Minor Issues**:
1.
2.
3.

**Notes**:


---

**Tested By**: _____________
**Date**: _____________
**Environment**: _____________
**Status**: □ Pass □ Fail □ Partial
