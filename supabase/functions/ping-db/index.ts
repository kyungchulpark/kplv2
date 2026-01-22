// supabase/functions/ping-db/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!; // 공개 호출이면 anon 사용 권장
  const supabase = createClient(url, key);

  // --- 테이블 방식 ---
  // const { error } = await supabase.from("heartbeat").select("id").limit(1);

  // --- RPC 방식(테이블 없이) ---
  const { error } = await supabase.rpc("heartbeat_rpc");

  return new Response(error ? "error" : "ok", { status: error ? 500 : 200 });
});
