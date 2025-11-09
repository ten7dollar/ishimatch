import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Route Handler（/app/api/*）で使うサーバー用 Supabase クライアント。
 * cookies は next/headers の cookies() をラップして渡します。
 */
export const createSupabaseServer = () =>
  createRouteHandlerClient({ cookies: () => cookies() }); // ★ ここもラッパー