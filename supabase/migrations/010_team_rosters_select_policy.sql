-- Allow public read access to team_rosters so stats views can resolve players/teams
-- Note: CREATE POLICY IF NOT EXISTS is not supported, so guard with a DO block.
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'team_rosters'
          and polname = 'Team rosters viewable by everyone'
    ) then
        execute $policy$
            create policy "Team rosters viewable by everyone"
                on team_rosters for select
                using (true);
        $policy$;
    end if;
end
$$;
