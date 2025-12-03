"use client";

import { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type UserRole = "student" | "hospital";

export default function HospitalLoginPage() {
  const supabase = createSupabaseBrowser();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    console.log("[LOGIN/HOSPITAL] submit start", { email });

    try {
      // 1) Supabase認証
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });
      if (error) {
        console.error("[LOGIN/HOSPITAL] signIn error", error);
        alert(`ログインに失敗しました：${error.message}`);
        setBusy(false);
        return;
      }
      console.log("[LOGIN/HOSPITAL] supabase signIn OK");

      // 2) ログインユーザーの role を確認
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("[LOGIN/HOSPITAL] getUser error", userError);
        alert("ユーザー情報の取得に失敗しました。もう一度お試しください。");
        setBusy(false);
        return;
      }

      const realRole = user?.user_metadata?.role as UserRole | undefined;
      if (realRole !== "hospital") {
        console.warn("[LOGIN/HOSPITAL] role mismatch:", realRole);
        alert(
          "このログイン画面は病院アカウント専用です。学生アカウントは学生ログイン画面からログインしてください。"
        );
        await supabase.auth.signOut().catch(() => {});
        setBusy(false);
        return;
      }

      // 3) /api/session で role/email を Cookie に付与
      const resp = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "hospital", email }), // ★ hospital 固定
      });
      console.log("[LOGIN/HOSPITAL] /api/session status", resp.status);

      // 4) 反映待ち → 病院ダッシュへ
      await new Promise((r) => setTimeout(r, 50));
      location.href = "/hospital/dashboard";
    } catch (err) {
      console.error("[LOGIN/HOSPITAL] unexpected error", err);
      alert("予期しないエラーが発生しました。時間をおいて再度お試しください。");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* ブランド（ロゴ） */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/brand/regimatch-logo.svg"
            alt="レジマッチ"
            height={44}
            width={123}
            priority
          />
          <p className="text-text-muted text-sm mt-2">
            初期研修医マッチングプラットフォーム
          </p>
        </div>

        <h2 className="text-lg font-semibold mb-3 text-primary-700">病院ログイン</h2>

        {/* フォーム */}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1 text-text-muted">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setPwd("");
                setEmail(e.target.value);
              }}
              placeholder="hospital@example.com"
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">
              パスワード
            </label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              required
            />
          </div>

          <button disabled={busy} className="btn-primary w-full">
            {busy ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="text-center text-sm mt-4 space-x-2">
          {/* 病院アカウントは基本的に運営側が発行する想定なら、新規登録リンクは出さない or お問い合わせにしてもOK */}
          {/* <a href="/hospital/signup" className="text-primary-600 hover:underline">
            病院アカウント新規登録
          </a> */}
          <a href="#" className="text-text-muted hover:underline">
            パスワードリセット
          </a>
        </div>

        <div className="text-center text-xs mt-4 text-gray-500">
          学生アカウントの方は{" "}
          <a href="/login" className="text-primary-600 hover:underline font-semibold">
            こちら
          </a>
          からログインしてください。
        </div>
      </div>
    </main>
  );
}