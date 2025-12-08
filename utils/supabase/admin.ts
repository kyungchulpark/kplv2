import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Supabase Admin Client (Service Role)
 * ⚠️ RLS를 우회합니다. 서버 사이드에서만 사용하세요!
 * 절대 클라이언트 컴포넌트에서 사용하지 마세요!
 */
export const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
