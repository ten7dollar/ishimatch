"use client";

import { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "../lib/supabase/client";

type UserRole = "student" | "hospital";

export default function LoginPage() {
  const supabase = createSupabaseBrowser();
  // ▼ これはあくまで「見た目用」のロール（プレースホルダ・見出し）
  const [uiRole, setUiRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    console.log("[LOGIN] submit start", { email, uiRole });

    try {
      // 1) Supabase認証（role はここでは関係ない）
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error) {
        console.error("[LOGIN] signIn error", error);
        alert(`ログインに失敗しました：${error.message}`);
        setBusy(false);
        return;
      }
      console.log("[LOGIN] supabase signIn OK");

      // 2) ログインしたユーザー情報を取得し、"本当の" role を確認
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("[LOGIN] getUser error", userError);
        alert("ユーザー情報の取得に失敗しました。もう一度お試しください。");
        setBusy(false);
        return;
      }

      const realRole = user?.user_metadata?.role as UserRole | undefined;
      if (realRole !== "student" && realRole !== "hospital") {
        console.warn("[LOGIN] unexpected role in user_metadata", realRole);
        alert("このアカウントの権限情報に問題があります。運営までお問い合わせください。");
        setBusy(false);
        return;
      }

      // 3) /api/session で "本当の role" と email を Cookie に付与
      const resp = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: realRole, email }),
      });
      console.log("[LOGIN] /api/session status", resp.status);

      // 4) 反映待ち → "本当の role" 別にダッシュへ
      await new Promise((r) => setTimeout(r, 50));
      const next = realRole === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
      location.href = next;
    } catch (err) {
      console.error("[LOGIN] unexpected error", err);
      // 予期せぬエラー時も一応 student 側に逃がす（必要なら病院側に切替）
      location.href = "/login";
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* ==== ブランド（ロゴ） ==== */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/brand/regimatch-logo.svg"
            alt="レジマッチ"
            height={44}
            width={123} // ロゴの横幅は見た目に合わせて微調整OK
            priority
          />
        <p className="text-text-muted text-sm mt-2">初期研修医マッチングプラットフォーム</p>
        </div>

        {/* ロール切替（UI用） */}
        <div className="flex mb-6 bg-primary-50 rounded-full p-1">
          <button
            type="button"
            onClick={() => setUiRole("student")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              uiRole === "student"
                ? "bg-primary-500 text-white shadow"
                : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            学生様はこちら
          </button>
          <button
            type="button"
            onClick={() => setUiRole("hospital")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              uiRole === "hospital"
                ? "bg-primary-500 text-white shadow"
                : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            病院様はこちら
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-3 text-primary-700">
          {uiRole === "student" ? "学生ログイン" : "病院ログイン"}
        </h2>

        {/* フォーム */}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1 text-text-muted">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setPwd("");
                setEmail(e.target.value);
              }}
              placeholder={uiRole === "student" ? "student@example.com" : "hospital@example.com"}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">パスワード</label>
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
          <a href="/signup" className="text-primary-600 hover:underline">
            新規登録
          </a>
          <span>・</span>
          <a href="#" className="text-text-muted hover:underline">
            パスワードリセット
          </a>
        </div>
      </div>
    </main>
  );
}