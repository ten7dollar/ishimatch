import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Route Handler（/app/api/*）で使うサーバー用 Supabase クライアント。
 * cookies は next/headers の cookies() をそのまま渡します。
 * Env（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）は自動で参照されます。
 */
export const createSupabaseServer = () =>
  createRouteHandlerClient({ cookies });