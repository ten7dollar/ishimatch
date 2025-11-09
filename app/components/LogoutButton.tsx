"use client";

import { createSupabaseBrowser } from "../lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const handleLogout = async () => {
    const supabase = createSupabaseBrowser();
    // 1) Supabaseセッションを終了（失敗しても次へ）
    try { await supabase.auth.signOut(); } catch {}
    // 2) role/email クッキー削除（middleware互換）
    try {
      await fetch("/api/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } catch {}
    // 3) /login へ（/ でも良いが、明示的に /login 推奨）
    location.href = "/login";
  };

  return (
    <button onClick={handleLogout} className={`text-sm text-gray-600 hover:underline ${className}`}>
      ログアウト
    </button>
  );
}