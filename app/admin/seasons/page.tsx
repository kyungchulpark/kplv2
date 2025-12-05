import { createClient } from "@/utils/supabase/server";
import { SeasonsManager } from "@/components/admin/seasons-manager";

export default async function SeasonsPage() {
  const supabase = await createClient();

  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });

  return <SeasonsManager seasons={seasons || []} />;
}
