"use client";

import { createSupabaseBrowser } from "@/app/lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const onLogout = async () => {
    const supabase = createSupabaseBrowser();

    // 念のためクライアント側でも signOut（無害）
    try { await supabase.auth.signOut(); } catch {}

    // Server 側でセッション Cookie を削除
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" }).catch(() => {});

    // role / email Cookie を削除（/api/session は既存のDELETEハンドラがある前提）
    await fetch("/api/session", { method: "DELETE", credentials: "include" }).catch(() => {});

    // Cookie 反映待ち → /login へ
    await new Promise((r) => setTimeout(r, 80));
    location.href = "/login";
  };

  return (
    <button onClick={onLogout} className={`text-sm text-gray-600 hover:underline ${className}`}>
      ログアウト
    </button>
  );
}