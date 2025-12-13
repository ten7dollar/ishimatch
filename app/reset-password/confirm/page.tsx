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
  const [hasSession, setHasSession] = useState(false);

  // 1) URLから recovery セッションを作る
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // query の token_hash/type 方式（安定）
        const token_hash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type"); // recovery が来る想定
        const code = url.searchParams.get("code");

        // hash の中に token_hash/type が入ってくるパターンもあるので拾う
        const hashParams = new URLSearchParams((url.hash || "").replace(/^#/, ""));
        const token_hash_h = hashParams.get("token_hash");
        const type_h = hashParams.get("type");

        const finalTokenHash = token_hash || token_hash_h;
        const finalType = type || type_h;

        // 初期メッセージは一旦消しておく（成功したら何も出さない）
        setMsg(null);

        // セッション確立を試す（失敗しても即エラーメッセージは出さない）
        if (finalTokenHash && finalType) {
          const { error } = await supabase.auth.verifyOtp({
            type: finalType as any, // "recovery"
            token_hash: finalTokenHash,
          });
          if (error) {
            console.warn("[reset-password/confirm] verifyOtp error:", error.message);
          }
        } else if (code && code.length > 0) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            console.warn("[reset-password/confirm] exchange error:", error.message);
          }
        } else {
          // token/code がない → ここではまだ最終判断しない（後でsession確認）
          console.warn("[reset-password/confirm] no token/code found in url");
        }

        // ★ 最終的に session が取れるかで判定する（ここが本丸）
        const { data } = await supabase.auth.getSession();
        const ok = !!data.session;
        setHasSession(ok);

        // session が無い場合だけメッセージを出す（＝誤表示を防ぐ）
        if (!ok) {
          setMsg(
            "セッションの確立に失敗しました。メールのリンクを同じブラウザで開いているか確認し、難しければもう一度リセットをお試しください。"
          );
        } else {
          setMsg(null);
        }
      } catch (e: any) {
        console.error("[reset-password/confirm] unexpected", e);
        setHasSession(false);
        setMsg("処理中にエラーが発生しました。もう一度リセットをお試しください。");
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
      // 念のためここでも session を再確認
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setHasSession(false);
        setMsg("認証セッションがありません。メールのリンクからもう一度お試しください。");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("パスワードを更新しました。ログイン画面へ移動します。");
      setTimeout(() => router.replace("/login"), 800);
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
          <p className="text-text-muted text-sm mt-2">パスワード再設定</p>
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
                disabled={!hasSession}
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
                disabled={!hasSession}
              />
            </div>

            <button disabled={busy || !hasSession} className="btn-primary w-full">
              {busy ? "更新中..." : "パスワードを更新"}
            </button>
          </form>
        )}

        {msg && <p className="text-sm text-gray-600 mt-4">{msg}</p>}

        <div className="text-center text-sm mt-6 space-x-2">
          <Link href="/reset-password" className="text-primary-600 hover:underline">
            再送・やり直す
          </Link>
          <span className="text-gray-400">・</span>
          <Link href="/login" className="text-primary-600 hover:underline">
            ログインへ
          </Link>
        </div>
      </div>
    </main>
  );
}