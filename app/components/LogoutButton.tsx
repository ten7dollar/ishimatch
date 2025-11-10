"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export default function LogoutButton({ className = "", children }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const sb = createSupabaseBrowser();

  // localStorage に残る Supabase トークンやアプリキャッシュを確実に削除
  const clearLocalAuth = useCallback(() => {
    try {
      const projectRef =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9-]+)\./)?.[1] ?? "";

      for (const k of Object.keys(localStorage)) {
        // Supabase の保存セッション
        if (k.includes("auth-token")) localStorage.removeItem(k);
        if (projectRef && k.startsWith(`sb-${projectRef}`)) localStorage.removeItem(k);

        // アプリ側で残しているキャッシュ（任意）
        if (k.startsWith("ishimatch:")) localStorage.removeItem(k);
      }

      // ページ間で使っていた一時値があればこちらも
      sessionStorage.clear();
    } catch {
      // 古いブラウザ等で例外が出ても致命ではないので握りつぶす
    }
  }, []);

  const onLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1) Supabase セッション破棄（localStorageからも基本的に消える）
      await sb.auth.signOut().catch(() => {});

      // 2) role / email Cookie を削除
      await fetch("/api/session", { method: "DELETE", credentials: "include" }).catch(() => {});

      // 3) 念のため localStorage 側のトークン/キャッシュも削除
      clearLocalAuth();

      // 4) login に戻す（戻るボタンで戻れないよう replace 推奨）
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onLogout}
      className={`text-sm text-gray-600 hover:underline ${className}`}
      aria-busy={busy}
      disabled={busy}
    >
      {children ?? "ログアウト"}
    </button>
  );
}