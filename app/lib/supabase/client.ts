// app/lib/supabase/client.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * ブラウザ用 Supabase クライアントを生成します。
 * - セッションを LocalStorage に永続化
 * - 自動トークン更新を有効化
 * - デバッグのため window.__sb に公開（必要なくなったら削除OK）
 */
let _client: SupabaseClient | null = null;

export function createSupabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const c = createClient(url, anon, {
    auth: {
      persistSession: true,     // ← セッションをブラウザに保持
      autoRefreshToken: true,   // ← 自動更新
      detectSessionInUrl: true, // ← OAuth 等の戻りでも検出
      flowType: "pkce",
    },
    global: {
      fetch: (input, init) => fetch(input as RequestInfo, init as RequestInit),
    },
  });

  // 🔎 デバッグ用に公開（Console から window.__sb.auth.getSession() などが打てます）
  if (typeof window !== "undefined") {
    (window as any).__sb = c;
  }

  _client = c;
  return _client;
}