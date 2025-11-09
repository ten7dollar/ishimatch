"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * App Router のクライアントコンポーネントで使う Supabase クライアント。
 * Env（NEXT_PUBLIC_SUPABASE_URL / ANON_KEY）は自動で参照されます。
 */
export const createSupabaseBrowser = () =>
  createClientComponentClient();