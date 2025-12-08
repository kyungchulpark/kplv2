# 한 사용자 = 한 팀 정책

## 📋 정책 개요

KPL 시스템에서는 **각 사용자가 시즌당 하나의 팀에만 소속**될 수 있습니다.

### 적용 범위:
- ✅ 팀장 (Captain)
- ✅ 팀원 (Roster Member)
- ✅ 팀 생성 신청자

---

## 🚫 제한사항

### 1. 팀 생성 신청 시
사용자가 다음 중 하나라도 해당하면 **팀 생성 신청 불가**:

- 이미 대기 중인 팀 생성 신청이 있음
- 현재 시즌에 팀장으로 등록된 팀이 있음
- 현재 시즌에 팀원으로 소속된 팀이 있음

#### 에러 메시지:
```
이미 대기 중인 팀 생성 신청이 있습니다.
이미 팀장으로 등록된 팀이 있습니다: [팀 이름]
이미 팀에 소속되어 있습니다: [팀 이름]
```

### 2. 팀 로스터 추가 시
선수를 로스터에 추가할 때:

- 이미 다른 팀의 로스터에 등록된 선수는 추가 불가
- 선수 선택 드롭다운에 이미 소속된 선수는 표시되지 않음
- 추가 시도 시 안전 체크 실행

#### 에러 메시지:
```
이 선수는 이미 다른 팀에 소속되어 있습니다: [팀 이름]
```

---

## 🛡️ 보호 레벨

### 1단계: 애플리케이션 레벨 체크
**위치:** `app/teams/create/page.tsx`

```typescript
// 팀장 여부 확인
const { data: captainTeam } = await supabase
  .from("teams")
  .select("id, name")
  .eq("season_id", activeSeason.id)
  .eq("captain_id", user.id)
  .single();

// 로스터 소속 여부 확인
const { data: rosterEntry } = await supabase
  .from("team_rosters")
  .select("team:teams(id, name)")
  .eq("season_id", activeSeason.id)
  .eq("player_id", user.id)
  .eq("is_active", true)
  .single();
```

### 2단계: 데이터베이스 레벨 제약
**위치:** `supabase/migrations/004_one_team_per_player.sql`

#### A. 유니크 인덱스
```sql
CREATE UNIQUE INDEX idx_one_team_per_player_per_season
ON team_rosters (player_id, season_id, is_active)
WHERE is_active = true;
```

**효과:**
- 한 선수가 동일 시즌에 여러 팀의 활성 로스터에 등록되는 것을 원천 차단
- 데이터베이스 레벨에서 강제 적용

#### B. 트리거 함수
```sql
CREATE TRIGGER before_team_request_insert
  BEFORE INSERT ON team_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_captain_team_membership();
```

**효과:**
- 팀 생성 신청 시 자동으로 팀 소속 여부 검사
- 이미 팀에 속한 사용자의 신청 차단

---

## 📝 설치 방법

### Supabase SQL Editor에서 실행:

```sql
-- 1. 파일 내용 복사: supabase/migrations/004_one_team_per_player.sql
-- 2. Supabase Dashboard → SQL Editor
-- 3. 복사한 내용 붙여넣기
-- 4. Run 클릭
```

### 실행 후 확인:

```sql
-- 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'team_rosters'
  AND indexname = 'idx_one_team_per_player_per_season';

-- 트리거 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'before_team_request_insert';
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 팀 생성 신청 중복 방지
1. 사용자 A가 "Team Alpha" 생성 신청
2. 대기 중 상태에서 다시 신청 시도
3. ❌ **결과:** "이미 대기 중인 팀 생성 신청이 있습니다."

### 시나리오 2: 팀장 중복 방지
1. 사용자 A의 "Team Alpha" 생성 승인됨
2. 사용자 A가 팀장이 됨
3. 사용자 A가 "Team Beta" 생성 신청 시도
4. ❌ **결과:** "이미 팀장으로 등록된 팀이 있습니다: Team Alpha"

### 시나리오 3: 로스터 중복 방지
1. 사용자 B가 "Team Alpha" 로스터에 추가됨
2. "Team Beta" 팀장이 사용자 B를 추가 시도
3. ❌ **결과:** "이 선수는 이미 다른 팀에 소속되어 있습니다: Team Alpha"

### 시나리오 4: 로스터 멤버의 팀 생성 방지
1. 사용자 C가 "Team Alpha" 로스터에 추가됨
2. 사용자 C가 팀 생성 신청 시도
3. ❌ **결과:** "이미 팀에 소속되어 있습니다: Team Alpha"

---

## 🔄 팀 변경 방법

사용자가 팀을 변경하려면:

### 방법 1: 기존 팀에서 나가기
1. 팀장에게 요청하여 로스터에서 제거
2. 또는 관리자가 로스터에서 제거
3. 제거 후 새로운 팀 생성/가입 가능

### 방법 2: 관리자 직접 수정
1. Admin → Teams → 해당 팀 선택
2. 로스터에서 선수 제거
3. 또는 Admin → Users → 사용자 선택 → 강제 삭제

---

## ⚠️ 주의사항

### 1. 시즌 분리
- 제약은 **시즌별로 적용**됩니다
- 새 시즌이 시작되면 사용자는 새로운 팀에 가입 가능
- 이전 시즌 데이터는 히스토리로 유지됨

### 2. is_active 플래그
- `team_rosters.is_active = false`인 경우는 제약에서 제외
- 로스터에서 제거 시 `is_active`를 false로 변경 (삭제 X)
- 이를 통해 히스토리 유지 + 제약 우회

### 3. 데이터베이스 마이그레이션
- 제약 추가 전 기존 데이터 정리 필요
- 중복 데이터가 있으면 인덱스 생성 실패

---

## 🔧 트러블슈팅

### 인덱스 생성 실패
```
ERROR: could not create unique index "idx_one_team_per_player_per_season"
DETAIL: Key (player_id, season_id, is_active)=(xxx, yyy, true) is duplicated.
```

**해결:**
```sql
-- 중복 데이터 찾기
SELECT player_id, season_id, COUNT(*)
FROM team_rosters
WHERE is_active = true
GROUP BY player_id, season_id
HAVING COUNT(*) > 1;

-- 중복 데이터 수동 정리 (필요시)
UPDATE team_rosters
SET is_active = false
WHERE id IN (
  -- 중복된 레코드 중 나중에 생성된 것들
  SELECT id FROM ...
);
```

### 트리거 실행 오류
```
ERROR: User is already a captain of a team in this season
```

**확인:**
- 사용자가 실제로 팀장인지 확인
- 필요시 기존 팀에서 제거 후 재시도

---

## 📚 관련 파일

- `app/teams/create/page.tsx` - 팀 생성 신청 체크
- `app/teams/[id]/manage/page.tsx` - 로스터 추가 체크
- `supabase/migrations/004_one_team_per_player.sql` - DB 제약
- `docs/ONE_TEAM_POLICY.md` - 이 문서

---

## ✅ 완료 체크리스트

- [ ] SQL 마이그레이션 실행 (`004_one_team_per_player.sql`)
- [ ] 인덱스 생성 확인
- [ ] 트리거 생성 확인
- [ ] 팀 생성 신청 테스트
- [ ] 로스터 추가 테스트
- [ ] 중복 방지 에러 메시지 확인
- [ ] 기존 데이터 정리 (필요시)
