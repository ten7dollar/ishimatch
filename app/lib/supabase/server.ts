import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Route Handler（/app/api/*）やサーバー側ユーティリティ用。
 * Env は NEXT_PUBLIC_* から読み取られます。
 */
export const createSupabaseServer = () =>
  createRouteHandlerClient({ cookies });