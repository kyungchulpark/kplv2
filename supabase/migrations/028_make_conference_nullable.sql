-- 팀의 컨퍼런스를 nullable로 변경
-- 리그 참가 전 팀은 컨퍼런스가 없는 상태로 대기

-- teams 테이블: NOT NULL 제약 제거하고 CHECK 제약도 null 허용하도록 변경
ALTER TABLE teams
ALTER COLUMN conference DROP NOT NULL;

-- 기존 CHECK 제약 삭제
ALTER TABLE teams
DROP CONSTRAINT IF EXISTS teams_conference_check;

-- 새로운 CHECK 제약 추가 (null 또는 'West', 'East'만 허용)
ALTER TABLE teams
ADD CONSTRAINT teams_conference_check
CHECK (conference IS NULL OR conference IN ('West', 'East'));

COMMENT ON COLUMN teams.conference IS '컨퍼런스 (Western/Eastern) - 리그 참가 전에는 null';

-- team_requests 테이블: CHECK 제약을 명시적으로 null 허용하도록 수정
ALTER TABLE team_requests
DROP CONSTRAINT IF EXISTS team_requests_conference_check;

ALTER TABLE team_requests
ADD CONSTRAINT team_requests_conference_check
CHECK (conference IS NULL OR conference IN ('West', 'East'));

COMMENT ON COLUMN team_requests.conference IS '요청 시점의 컨퍼런스 - 일반적으로 null (관리자가 나중에 배정)';
