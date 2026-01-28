import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Server-only service role client for read-heavy admin/history screens.
 * This bypasses RLS but never leaves the server runtime.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

