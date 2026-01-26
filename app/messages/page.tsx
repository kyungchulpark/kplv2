import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MessagesClient from "@/components/messages/messages-client";

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get all players for the "New Conversation" dialog
  const { data: players } = await supabase
    .from("profiles")
    .select("id, psn_id, avatar_url, email")
    .neq("id", user.id)
    .order("psn_id");

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
      <Suspense fallback={<div>Loading messages...</div>}>
        <MessagesClient currentUserId={user.id} availablePlayers={players || []} />
      </Suspense>
    </div>
  );
}
