-- team_rosters의 season_id를 nullable로 변경
-- 시즌이 배정되지 않은 팀에도 선수 추가 가능하도록

ALTER TABLE team_rosters
ALTER COLUMN season_id DROP NOT NULL;

COMMENT ON COLUMN team_rosters.season_id IS 'Season ID - 시즌 배정 전 팀에 추가된 선수는 null일 수 있음';
