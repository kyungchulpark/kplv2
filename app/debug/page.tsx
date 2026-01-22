"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDebugData() {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setData({ error: "Not logged in" });
        setLoading(false);
        return;
      }

      // Get all teams where user is captain
      const { data: captainTeams } = await supabase
        .from("teams")
        .select("*")
        .eq("captain_id", user.id);

      // Get all roster entries for user
      const { data: rosters } = await supabase
        .from("team_rosters")
        .select("*, team:teams(*)")
        .eq("player_id", user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setData({
        userId: user.id,
        userEmail: user.email,
        profile,
        captainTeams,
        rosters,
      });
      setLoading(false);
    }

    loadDebugData();
  }, []);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">디버그 정보</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>사용자 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
