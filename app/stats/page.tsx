import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsTable, PlayerStatRow } from "@/components/stats/stats-table";
import { SeasonSelector } from "@/components/stats/season-selector";

interface StatsPageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

type ProfileEntry = {
  id: string;
  psn_id: string;
  avatar_url: string | null;
};

type TeamEntry = {
  id: string;
  name: string;
  logo_url: string | null;
};

function normalizePsnId(value: string) {
  return value.trim().toLowerCase();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const { seasonId } = await searchParams;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const pagedSelect = async (
    client: any,
    table: string,
    select: string,
    applyFilters?: (query: any) => any
  ) => {
    const rows: any[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      let query = client.from(table).select(select).range(from, to);
      if (applyFilters) {
        query = applyFilters(query);
      }
      const { data, error } = await query;
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  };

  // Get seasons for selector and resolve the selected season
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, is_active, start_date")
    .order("start_date", { ascending: false });

  if (!seasons || seasons.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
            <CardDescription>No seasons available.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const activeSeason = seasons.find((season) => season.is_active) || seasons[0];
  const selectedSeason =
    seasons.find((season) => season.id === seasonId) || activeSeason;

  // Get finished matches for the selected season
  const finishedMatches = await pagedSelect(
    supabase,
    "matches",
    "id",
    (query) => query.eq("season_id", selectedSeason.id).eq("status", "finished")
  );

  const matchIds = Array.from(new Set(finishedMatches.map((match) => match.id)));

  let rows: PlayerStatRow[] = [];

  if (matchIds.length > 0) {
    // Build PSN -> profile mapping (current PSN IDs + history)
    const profiles = await pagedSelect(
      adminClient,
      "profiles",
      "id, psn_id, avatar_url"
    );
    const psnHistory = await pagedSelect(
      adminClient,
      "psn_id_history",
      "user_id, old_psn_id, new_psn_id"
    );

    const profileById = new Map<string, ProfileEntry>();
    const psnToProfile = new Map<string, ProfileEntry>();

    (profiles || []).forEach((profile: any) => {
      const entry: ProfileEntry = {
        id: profile.id,
        psn_id: profile.psn_id || "",
        avatar_url: profile.avatar_url || null,
      };
      profileById.set(entry.id, entry);
      if (entry.psn_id) {
        psnToProfile.set(normalizePsnId(entry.psn_id), entry);
      }
    });

    (psnHistory || []).forEach((history: any) => {
      const profile = profileById.get(history.user_id);
      if (!profile) return;
      if (history.old_psn_id) {
        psnToProfile.set(normalizePsnId(history.old_psn_id), profile);
      }
      if (history.new_psn_id) {
        psnToProfile.set(normalizePsnId(history.new_psn_id), profile);
      }
    });

    // Team info for fallback lookups
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("season_id", selectedSeason.id);

    const teamInfo = new Map<string, TeamEntry>();
    (teams || []).forEach((team: any) => {
      teamInfo.set(team.id, {
        id: team.id,
        name: team.name,
        logo_url: team.logo_url || null,
      });
    });

    // Get current match stats with player/team info
    const rawStats: any[] = [];
    for (const ids of chunkArray(matchIds, 80)) {
      const { data, error } = await supabase
        .from("match_stats")
        .select(
          `
          match_id,
          team_id,
          player_id,
          grade,
          pts,
          reb,
          ast,
          stl,
          blk,
          fls,
          turnovers,
          fgm,
          fga,
          three_pm,
          three_pa,
          ftm,
          fta,
          player:player_id(
            psn_id,
            avatar_url
          ),
          team:team_id(
            name,
            logo_url
          )
        `
        )
        .in("match_id", ids);
      if (error) throw error;
      rawStats.push(...(data || []));
    }

    // Get legacy match stats (old_match_stats -> old_profiles)
    const legacyStats: any[] = [];
    for (const ids of chunkArray(matchIds, 80)) {
      const { data, error } = await supabase
        .from("old_match_stats")
        .select(
          `
          match_id,
          team_id,
          old_profile_id,
          grade,
          pts,
          reb,
          ast,
          stl,
          blk,
          fls,
          turnovers,
          fgm,
          fga,
          three_pm,
          three_pa,
          ftm,
          fta,
          old_profile:old_profile_id(
            psn_id,
            psn_id_normalized
          ),
          team:team_id(
            name,
            logo_url
          )
        `
        )
        .in("match_id", ids);
      if (error) throw error;
      legacyStats.push(...(data || []));
    }

    const aggregated = new Map<string, PlayerStatRow>();
    const teamCounts = new Map<string, Map<string, number>>();

    const bumpTeamCount = (
      playerId: string,
      teamId: string | null,
      teamName?: string | null,
      teamLogoUrl?: string | null
    ) => {
      if (!teamId) return;
      const counts = teamCounts.get(playerId) || new Map<string, number>();
      counts.set(teamId, (counts.get(teamId) || 0) + 1);
      teamCounts.set(playerId, counts);

      if (!teamInfo.has(teamId)) {
        teamInfo.set(teamId, {
          id: teamId,
          name: teamName || "Unknown",
          logo_url: teamLogoUrl || null,
        });
      }
    };

    const upsertAggregate = (playerId: string, seed: Partial<PlayerStatRow>) => {
      const existing = aggregated.get(playerId);
      if (existing) return existing;
      const row: PlayerStatRow = {
        player_id: playerId,
        psn_id: seed.psn_id || "Unknown",
        avatar_url: seed.avatar_url || null,
        team_id: seed.team_id ?? null,
        team_name: seed.team_name || "Unknown",
        team_logo_url: seed.team_logo_url || null,
        games_played: 0,
        grade: seed.grade ?? null,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        fls: 0,
        turnovers: 0,
        fgm: 0,
        fga: 0,
        three_pm: 0,
        three_pa: 0,
        ftm: 0,
        fta: 0,
      };
      aggregated.set(playerId, row);
      return row;
    };

    (rawStats || []).forEach((stat: any) => {
      const playerId = stat.player_id as string;
      const player = stat.player;
      const team = stat.team;

      bumpTeamCount(playerId, stat.team_id as string | null, team?.name, team?.logo_url);

      const row = upsertAggregate(playerId, {
        psn_id: player?.psn_id,
        avatar_url: player?.avatar_url,
        team_id: stat.team_id as string | null,
        team_name: team?.name,
        team_logo_url: team?.logo_url,
        grade: stat.grade,
      });

      row.games_played += 1;
      row.grade = stat.grade ?? row.grade;
      row.pts += stat.pts ?? 0;
      row.reb += stat.reb ?? 0;
      row.ast += stat.ast ?? 0;
      row.stl += stat.stl ?? 0;
      row.blk += stat.blk ?? 0;
      row.fls += stat.fls ?? 0;
      row.turnovers += stat.turnovers ?? 0;
      row.fgm += stat.fgm ?? 0;
      row.fga += stat.fga ?? 0;
      row.three_pm += stat.three_pm ?? 0;
      row.three_pa += stat.three_pa ?? 0;
      row.ftm += stat.ftm ?? 0;
      row.fta += stat.fta ?? 0;
    });

    (legacyStats || []).forEach((stat: any) => {
      const oldProfile = stat.old_profile;
      if (!oldProfile?.psn_id) return;

      const normalized =
        oldProfile.psn_id_normalized || normalizePsnId(oldProfile.psn_id);
      const mappedProfile = psnToProfile.get(normalized);

      const playerId = mappedProfile?.id || `legacy:${stat.old_profile_id}`;
      const psnId = mappedProfile?.psn_id || oldProfile.psn_id;
      const avatarUrl = mappedProfile?.avatar_url || null;

      const team = stat.team;
      bumpTeamCount(playerId, stat.team_id || null, team?.name, team?.logo_url);

      const row = upsertAggregate(playerId, {
        psn_id: psnId,
        avatar_url: avatarUrl,
        team_id: stat.team_id || null,
        team_name: team?.name,
        team_logo_url: team?.logo_url,
        grade: stat.grade,
      });

      row.games_played += 1;
      row.grade = stat.grade ?? row.grade;
      row.pts += stat.pts ?? 0;
      row.reb += stat.reb ?? 0;
      row.ast += stat.ast ?? 0;
      row.stl += stat.stl ?? 0;
      row.blk += stat.blk ?? 0;
      row.fls += stat.fls ?? 0;
      row.turnovers += stat.turnovers ?? 0;
      row.fgm += stat.fgm ?? 0;
      row.fga += stat.fga ?? 0;
      row.three_pm += stat.three_pm ?? 0;
      row.three_pa += stat.three_pa ?? 0;
      row.ftm += stat.ftm ?? 0;
      row.fta += stat.fta ?? 0;
    });

    // Choose the most common team per player for display
    aggregated.forEach((row, playerId) => {
      const counts = teamCounts.get(playerId);
      if (!counts || counts.size === 0) return;

      let bestTeamId: string | null = null;
      let bestCount = -1;
      counts.forEach((count, teamId) => {
        if (count > bestCount) {
          bestCount = count;
          bestTeamId = teamId;
        }
      });

      if (bestTeamId) {
        const info = teamInfo.get(bestTeamId);
        row.team_id = bestTeamId;
        row.team_name = info?.name || row.team_name || "Unknown";
        row.team_logo_url = info?.logo_url ?? row.team_logo_url ?? null;
      }
    });

    rows = Array.from(aggregated.values());
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Stats</h1>
            <p className="text-xl text-muted-foreground">
              {selectedSeason.name} - Player stats from match results
            </p>
          </div>

          <div className="flex items-center">
            <SeasonSelector
              seasons={seasons.map((season) => ({
                id: season.id,
                name: season.name,
                is_active: season.is_active,
              }))}
              selectedSeasonId={selectedSeason.id}
            />
          </div>
        </div>

        <StatsTable rows={rows} />
      </div>
    </div>
  );
}
