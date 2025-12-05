# KPL (Korea Proam League) 🏀

NBA 2K 온라인 리그 관리 시스템 - NBA.com 스타일 디자인

## 📋 프로젝트 소개

KPL은 NBA 2K eSports 리그를 관리하기 위한 풀스택 웹 애플리케이션입니다.
NBA.com의 세련된 디자인을 바탕으로 한국 프로암 리그의 시즌, 팀, 선수, 경기 기록을 체계적으로 관리합니다.

## 🚀 빠른 시작

### 1. 저장소 클론 및 설치

```bash
git clone <repository-url>
cd kpl_v2
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Supabase 키 찾는 방법:**
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. Settings (⚙️) → API
4. Project URL과 anon public key 복사

### 3. 데이터베이스 설정

Supabase SQL Editor에서 순서대로 실행:

```sql
-- 1. Schema updates
supabase/schema_updates.sql

-- 2. Team requests table
supabase/migrations/001_team_requests.sql

-- 3. Matches updates
supabase/migrations/002_matches_updates.sql

-- 4. Dummy data (선택사항)
supabase/dummy_data_v2.sql
```

자세한 설정: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 5. Storage 설정

Supabase SQL Editor에서 팀 로고 업로드용 스토리지 설정:

자세한 설정: [STORAGE_SETUP.md](./STORAGE_SETUP.md)

### 6. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

## 📁 프로젝트 구조

```
kpl_v2/
├── app/                    # Next.js App Router 페이지
│   ├── admin/             # 관리자 페이지
│   ├── auth/              # 인증 페이지
│   ├── standings/         # 순위표
│   └── page.tsx           # 메인 페이지
├── components/            # 재사용 컴포넌트
│   ├── admin/             # 관리자 컴포넌트
│   ├── auth/              # 인증 컴포넌트
│   ├── home/              # 홈 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── standings/         # 순위표 컴포넌트
│   └── ui/                # UI 컴포넌트 (shadcn/ui)
├── utils/                 # 유틸리티 함수
│   └── supabase/          # Supabase 클라이언트
├── types/                 # TypeScript 타입 정의
└── supabase/              # Supabase 관련
    └── schema.sql         # 데이터베이스 스키마
```

## ✨ 주요 기능

### 사용자 기능
- 🔐 **이중 인증**: Google OAuth & 이메일/비밀번호
- 🏆 **팀 생성 신청**: 로고 업로드 포함
- 📊 **실시간 순위표**: Western/Eastern Conference 분리
- 📅 **경기 일정**: 시즌별 매치 스케줄
- 📈 **선수 통계**: 득점, 리바운드, 어시스트 등 8개 카테고리
- 👤 **프로필 관리**: PSN ID 기반 개인정보

### 관리자 기능
- 🎮 **시즌 관리**: 생성, 활성화, 종료
- 👥 **팀 관리**: CRUD, 전적 관리
- ✅ **팀 신청 승인**: Pending/Approved/Rejected 처리
- 🏀 **경기 관리**: 일정, 점수, 상태 관리
- 📤 **엑셀 업로드**: 일정 일괄 등록 (한 날짜 10경기 지원)
- 📊 **대시보드**: 통계 및 현황 한눈에 확인

## 🎨 기술 스택

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Google OAuth)
- **State Management:** Zustand, React Query
- **UI Components:** shadcn/ui + Radix UI
- **Icons:** Lucide React

## 📊 데이터베이스 스키마

### 주요 테이블
- **profiles** - 사용자 프로필 (PSN ID, 역할)
- **seasons** - 시즌 관리
- **teams** - 팀 정보 (승패, 득실점)
- **team_rosters** - 선수-팀 연결
- **matches** - 경기 일정 및 결과
- **match_stats** - 개인 경기 통계

### 뷰 (Views)
- **current_standings** - 현재 시즌 순위표
- **player_season_stats** - 시즌별 선수 통계

## 🔐 권한 시스템

- **admin** - 모든 관리 기능 접근
- **staff** - 경기 결과 입력 가능
- **user** - 일반 사용자 (조회만 가능)

## 📝 환경 변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |

## 🎨 NBA.com 테마

**공식 컬러 시스템:**
- Primary: NBA Red (#CE1141)
- Secondary: NBA Blue (#1D428A)
- Accent: NBA Gold (#FDB927)
- Base: Pure Black / White

18개 파일에 일관된 NBA 테마 적용 완료!

## 📊 엑셀 업로드

관리자는 Excel로 경기 일정을 일괄 등록할 수 있습니다.

**필수 컬럼:**
- match_sequence (고유 ID)
- match_date (YYYY-MM-DD)
- home_team / away_team (팀 이름)
- match_time (HH:MM)
- game_password (선택)

**한 날짜에 여러 경기 등록 가능** - 10팀이면 하루 10경기까지!

템플릿 다운로드: `/admin/upload-schedule`

## 🚧 개발 현황

**전체 진행률: ~95%** 🎉

✅ 완료:
- Database schema & migrations
- Email/Password + Google OAuth
- NBA.com 테마 (18개 파일)
- Admin Dashboard (6 페이지)
- Excel 업로드 (실제 파싱 구현)
- 팀 생성 신청 시스템
- **관리자 CRUD 다이얼로그 (Seasons, Teams, Matches)**
- **Schedule Table 디자인 (NBA.com 스타일)**
- **팀 신청 승인/거부 시스템**
- 더미 데이터 (2 시즌, 20 팀, 10 경기)
- **Supabase Storage 문서화**

✅ 문서화:
- **테스트 체크리스트**: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- **관리자 가이드**: [docs/ADMIN_GUIDE.md](./docs/ADMIN_GUIDE.md)
- **사용자 가이드**: [docs/USER_GUIDE.md](./docs/USER_GUIDE.md)

**상세 구현 내역**: [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)

## 📄 라이센스

MIT License

## 🤝 기여하기

이슈 및 풀 리퀘스트는 언제나 환영합니다!

---

Made with ❤️ for KPL Community
