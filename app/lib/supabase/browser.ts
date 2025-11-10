// app/lib/supabase/browser.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function createSupabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const c = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // v2 ではこちらがデフォルト
    },
  });

  if (typeof window !== 'undefined') {
    // コンソールから検証するための公開（デバッグ終わったら削除してOK）
    (window as any).__sb = c;
  }
  _client = c;
  return c;
}