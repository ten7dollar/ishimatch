// app/lib/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ブラウザ用 Supabase クライアント（シングルトン）
 * - セッションを LocalStorage に永続化（persistSession: true）
 * - アクセストークンの自動更新（autoRefreshToken: true）
 * - OAuth コールバックのセッション検出（detectSessionInUrl: true）
 * - PKCE フローを使用（flowType: "pkce"）
 * - ✅ 何度呼ばれても同じインスタンスを返す
 * - ✅ window へのデバッグ露出（window.__sb）は行いません
 */
let _client: SupabaseClient | null = null;

export function createSupabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing Supabase env. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const client = createClient(url, anon, {
    auth: {
      persistSession: true,       // ログイン状態を localStorage に保持
      autoRefreshToken: true,     // トークン自動更新
      detectSessionInUrl: true,   // OAuth などのコールバックURLから復元
      flowType: "pkce",
    },
    global: {
      // Next.js の fetch を利用（SSR との整合性を保つ）
      fetch: (input, init) => fetch(input as RequestInfo, init as RequestInit),
    },
  });

  _client = client;
  return _client;
}