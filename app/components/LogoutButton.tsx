"use client";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const handleLogout = async () => {
    const supabase = createSupabaseBrowser();
    try { await supabase.auth.signOut(); } catch {}

    // 1) サーバ側で Supabase クッキーを削除
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" }).catch(() => {});

    // 2) role / email クッキーも削除
    await fetch("/api/session", { method: "DELETE", credentials: "include" }).catch(() => {});

    await new Promise(r => setTimeout(r, 100));
    location.href = "/login";
  };

  return (
    <button onClick={handleLogout} className={`text-sm text-gray-600 hover:underline ${className}`}>
      ログアウト
    </button>
  );
}