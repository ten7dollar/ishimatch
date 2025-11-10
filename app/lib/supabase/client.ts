// app/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

/**
 * ブラウザ専用クライアント
 * - セッション永続化 / 自動更新を明示的に有効化
 * - これにより getSession() が安定して user を返す
 */
export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, anon, {
    auth: {
      persistSession: true,     // ← 必須：ブラウザにセッションを保持
      autoRefreshToken: true,   // ← 必須：トークン自動更新
      detectSessionInUrl: true, // OAuth等の戻りでも検出
      flowType: "pkce",
    },
    global: {
      // fetch を Next の runtime に合わせる（任意）
      fetch: (input, init) => fetch(input as RequestInfo, init as RequestInit),
    },
  });
}