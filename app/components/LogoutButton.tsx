"use client";

import { createSupabaseBrowser } from "../lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const handleLogout = async () => {
    const supabase = createSupabaseBrowser();
    // Supabase のセッション終了（失敗しても無視）
    try { await supabase.auth.signOut(); } catch {}
    // 既存middleware互換の role/email クッキーを削除
    try { await fetch("/api/session", { method: "DELETE" }); } catch {}
    // /login へ移動（/ でも可。ただし /login の方が明示的）
    location.href = "/login";
  };

  return (
    <button onClick={handleLogout} className={`text-sm text-gray-600 hover:underline ${className}`}>
      ログアウト
    </button>
  );
}