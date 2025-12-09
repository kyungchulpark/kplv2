-- Recreate update_team_standings trigger and backfill standings

-- 1) Function
create or replace function update_team_standings()
returns trigger as $$
begin
    -- Only when moving into finished status
    if new.status = 'finished' and (old.status is null or old.status <> 'finished') then
        -- Home team
        update teams
        set
            wins = wins + case when new.home_score > new.away_score then 1 else 0 end,
            losses = losses + case when new.home_score < new.away_score then 1 else 0 end,
            points_for = points_for + new.home_score,
            points_against = points_against + new.away_score,
            updated_at = now()
        where id = new.home_team_id;

        -- Away team
        update teams
        set
            wins = wins + case when new.away_score > new.home_score then 1 else 0 end,
            losses = losses + case when new.away_score < new.home_score then 1 else 0 end,
            points_for = points_for + new.away_score,
            points_against = points_against + new.home_score,
            updated_at = now()
        where id = new.away_team_id;
    end if;
    return new;
end
$$ language plpgsql;

-- 2) Trigger
drop trigger if exists update_team_standings_on_matches on matches;
create trigger update_team_standings_on_matches
after update on matches
for each row
execute function update_team_standings();

-- 3) Backfill standings from finished matches
with home as (
    select
        home_team_id as team_id,
        sum(case when home_score > away_score then 1 else 0 end) as wins,
        sum(case when home_score < away_score then 1 else 0 end) as losses,
        sum(home_score) as pf,
        sum(away_score) as pa
    from matches
    where status = 'finished'
    group by home_team_id
),
away as (
    select
        away_team_id as team_id,
        sum(case when away_score > home_score then 1 else 0 end) as wins,
        sum(case when away_score < home_score then 1 else 0 end) as losses,
        sum(away_score) as pf,
        sum(home_score) as pa
    from matches
    where status = 'finished'
    group by away_team_id
),
agg as (
    select team_id,
           coalesce(sum(wins),0) as wins,
           coalesce(sum(losses),0) as losses,
           coalesce(sum(pf),0) as pf,
           coalesce(sum(pa),0) as pa
    from (
        select * from home
        union all
        select * from away
    ) s
    group by team_id
)
update teams t
set wins = coalesce(a.wins, 0),
    losses = coalesce(a.losses, 0),
    points_for = coalesce(a.pf, 0),
    points_against = coalesce(a.pa, 0),
    updated_at = now()
from agg a
where t.id = a.team_id;

-- Reset teams with no finished games to zero
with finished as (
    select distinct team_id
    from (
        select home_team_id as team_id from matches where status = 'finished'
        union
        select away_team_id as team_id from matches where status = 'finished'
    ) s
)
update teams
set wins = 0, losses = 0, points_for = 0, points_against = 0, updated_at = now()
where id not in (select team_id from finished);
