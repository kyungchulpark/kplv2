-- Allow public read access to team_rosters so stats views can resolve players/teams
create policy if not exists "Team rosters viewable by everyone"
    on team_rosters for select
    using (true);
