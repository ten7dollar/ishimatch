"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

export default function ResetPasswordRequestPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password/confirm`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setMsg(
        "パスワード再設定メールを送信しました。届かない場合は迷惑メールもご確認ください。"
      );
    } catch (e: any) {
      console.error("[reset-password] send error", e);
      setMsg(`送信に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/brand/regimatch-logo.svg"
            alt="レジマッチ"
            height={44}
            width={123}
            priority
          />
          <p className="text-text-muted text-sm mt-2">
            パスワード再設定
          </p>
        </div>

        <h1 className="text-lg font-semibold mb-3 text-primary-700">
          パスワードを再設定する
        </h1>

        <form onSubmit={onSend} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-text-muted">
              登録メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              required
            />
          </div>

          <button disabled={busy} className="btn-primary w-full">
            {busy ? "送信中..." : "再設定メールを送信"}
          </button>
        </form>

        {msg && <p className="text-sm text-gray-600 mt-4">{msg}</p>}

        <div className="text-center text-sm mt-6">
          <Link href="/login" className="text-primary-600 hover:underline">
            ログインへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}