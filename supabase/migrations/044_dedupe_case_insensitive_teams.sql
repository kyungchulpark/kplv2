-- Dedupe teams that only differ by case within a season and prevent future duplicates.

DO $$
DECLARE
  grp RECORD;
  canonical_id UUID;
  duplicate_id UUID;
  preferred_name TEXT;
  dup_ids UUID[];
BEGIN
  FOR grp IN
    SELECT season_id, lower(name) AS name_key, array_agg(id) AS ids
    FROM teams
    GROUP BY season_id, lower(name)
    HAVING COUNT(*) > 1
  LOOP
    dup_ids := grp.ids;

    -- Guard against matches that would become same-team matches.
    IF to_regclass('public.matches') IS NOT NULL AND EXISTS (
      SELECT 1
      FROM matches
      WHERE home_team_id = ANY(dup_ids)
        AND away_team_id = ANY(dup_ids)
    ) THEN
      RAISE NOTICE 'Skipping duplicate teams for season %, name % due to same-team matches.',
        grp.season_id, grp.name_key;
      CONTINUE;
    END IF;

    -- Pick canonical team by reference count, then created_at.
    SELECT t.id
    INTO canonical_id
    FROM teams t
    WHERE t.id = ANY(dup_ids)
    ORDER BY (
      COALESCE((SELECT COUNT(*) FROM matches m WHERE m.home_team_id = t.id OR m.away_team_id = t.id), 0) +
      COALESCE((SELECT COUNT(*) FROM match_stats ms WHERE ms.team_id = t.id), 0) +
      COALESCE((SELECT COUNT(*) FROM old_match_stats oms WHERE oms.team_id = t.id), 0) +
      COALESCE((SELECT COUNT(*) FROM team_rosters tr WHERE tr.team_id = t.id), 0) +
      COALESCE((SELECT COUNT(*) FROM old_team_rosters otr WHERE otr.team_id = t.id), 0)
    ) DESC,
    t.created_at NULLS LAST,
    t.id
    LIMIT 1;

    -- Choose the nicest display name among duplicates.
    SELECT t.name
    INTO preferred_name
    FROM teams t
    WHERE t.id = ANY(dup_ids)
    ORDER BY
      LENGTH(REGEXP_REPLACE(t.name, '[^A-Z]', '', 'g')) DESC,
      LENGTH(t.name) DESC,
      t.name ASC
    LIMIT 1;

    FOREACH duplicate_id IN ARRAY dup_ids LOOP
      IF duplicate_id = canonical_id THEN
        CONTINUE;
      END IF;

      IF to_regclass('public.matches') IS NOT NULL THEN
        UPDATE matches SET home_team_id = canonical_id WHERE home_team_id = duplicate_id;
        UPDATE matches SET away_team_id = canonical_id WHERE away_team_id = duplicate_id;
        UPDATE matches SET forfeit_winner_id = canonical_id WHERE forfeit_winner_id = duplicate_id;
      END IF;

      IF to_regclass('public.team_rosters') IS NOT NULL THEN
        DELETE FROM team_rosters tr
        USING team_rosters tr2
        WHERE tr.team_id = duplicate_id
          AND tr2.team_id = canonical_id
          AND tr.player_id = tr2.player_id
          AND tr.season_id = tr2.season_id;
        UPDATE team_rosters SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.match_stats') IS NOT NULL THEN
        UPDATE match_stats SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.old_match_stats') IS NOT NULL THEN
        UPDATE old_match_stats SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.old_team_rosters') IS NOT NULL THEN
        DELETE FROM old_team_rosters otr
        USING old_team_rosters otr2
        WHERE otr.team_id = duplicate_id
          AND otr2.team_id = canonical_id
          AND otr.old_profile_id = otr2.old_profile_id
          AND otr.season_id = otr2.season_id;
        UPDATE old_team_rosters SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.team_penalties') IS NOT NULL THEN
        UPDATE team_penalties SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.team_withdrawals') IS NOT NULL THEN
        DELETE FROM team_withdrawals tw
        USING team_withdrawals tw2
        WHERE tw.team_id = duplicate_id
          AND tw2.team_id = canonical_id
          AND tw.season_id = tw2.season_id;
        UPDATE team_withdrawals SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.team_roles') IS NOT NULL THEN
        DELETE FROM team_roles tr
        USING team_roles tr2
        WHERE tr.team_id = duplicate_id
          AND tr2.team_id = canonical_id
          AND tr.player_id = tr2.player_id
          AND tr.role = tr2.role
          AND tr.season_id = tr2.season_id;
        UPDATE team_roles SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.playoff_series') IS NOT NULL THEN
        UPDATE playoff_series SET team1_id = canonical_id WHERE team1_id = duplicate_id;
        UPDATE playoff_series SET team2_id = canonical_id WHERE team2_id = duplicate_id;
        UPDATE playoff_series SET winner_id = canonical_id WHERE winner_id = duplicate_id;
      END IF;

      IF to_regclass('public.playoff_matches') IS NOT NULL THEN
        UPDATE playoff_matches SET home_team_id = canonical_id WHERE home_team_id = duplicate_id;
        UPDATE playoff_matches SET away_team_id = canonical_id WHERE away_team_id = duplicate_id;
      END IF;

      IF to_regclass('public.playoff_stats') IS NOT NULL THEN
        UPDATE playoff_stats SET team_id = canonical_id WHERE team_id = duplicate_id;
      END IF;

      IF to_regclass('public.season_champions') IS NOT NULL THEN
        UPDATE season_champions SET champion_team_id = canonical_id WHERE champion_team_id = duplicate_id;
        UPDATE season_champions SET runner_up_team_id = canonical_id WHERE runner_up_team_id = duplicate_id;
      END IF;

      DELETE FROM teams WHERE id = duplicate_id;

      RAISE NOTICE 'Merged team % into % for season %, key %.',
        duplicate_id, canonical_id, grp.season_id, grp.name_key;
    END LOOP;

    UPDATE teams
    SET name = preferred_name
    WHERE id = canonical_id;
  END LOOP;
END $$;

-- Prevent case-only duplicates going forward.
CREATE UNIQUE INDEX IF NOT EXISTS teams_season_lower_name_key
ON teams (season_id, lower(name));

