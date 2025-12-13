"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

export default function ResetPasswordConfirmPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const [ready, setReady] = useState(false);

  // 1) URLのcodeからセッションを作る
  useEffect(() => {
    (async () => {
      try {
        const url = window.location.href;
        // recoveryリンクの場合、ここでセッションが張られる
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.warn("[reset-password/confirm] exchange error", error.message);
          // exchangeが不要な形式の場合もあるので、ここでは致命にしない
        }
      } catch (e: any) {
        console.error("[reset-password/confirm] exchange unexpected", e);
      } finally {
        setReady(true);
      }
    })();
  }, [supabase]);

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setMsg(null);

    if (!pw1 || pw1.length < 8) {
      setMsg("パスワードは8文字以上で入力してください。");
      return;
    }
    if (pw1 !== pw2) {
      setMsg("確認用パスワードが一致しません。");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("パスワードを更新しました。ログイン画面へ移動します。");

      // Cookie role はログイン時に付与されるので、ここではログインへ戻す
      setTimeout(() => {
        router.replace("/login");
      }, 800);
    } catch (e: any) {
      console.error("[reset-password/confirm] update error", e);
      setMsg(`更新に失敗しました：${e?.message ?? "unknown"}`);
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
          新しいパスワードを設定
        </h1>

        {!ready ? (
          <p className="text-sm text-gray-600">確認中…</p>
        ) : (
          <form onSubmit={onUpdate} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-text-muted">
                新しいパスワード（8文字以上）
              </label>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-text-muted">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
                required
              />
            </div>

            <button disabled={busy} className="btn-primary w-full">
              {busy ? "更新中..." : "パスワードを更新"}
            </button>
          </form>
        )}

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