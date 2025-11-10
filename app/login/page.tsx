"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function LoginPage() {
  const supabase = createSupabaseBrowser();

  const [role, setRole] = useState<"student" | "hospital">("student");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    console.log("[LOGIN] submit start", { email, role });

    try {
      // 1) Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });
      if (error) {
        console.error("[LOGIN] supabase signIn error", error);
        alert(`ログインに失敗しました：${error.message}`);
        setBusy(false);
        return;
      }
      console.log("[LOGIN] supabase signIn OK");

      // 2) user & role 決定
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const resolvedRole =
        (user?.user_metadata?.role as "student" | "hospital") ?? role;

      // 未設定なら救済
      if (user && !user?.user_metadata?.role) {
        try {
          await supabase.auth.updateUser({ data: { role: resolvedRole } });
          console.log("[LOGIN] user_metadata.role set", resolvedRole);
        } catch (err) {
          console.warn("[LOGIN] set role failed (non fatal)", err);
        }
      }

      // 3) /api/session にクッキーを設定
      const resp = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: resolvedRole, email }),
      });
      console.log("[LOGIN] /api/session POST status", resp.status);

      // Set-Cookie 反映待ち
      await new Promise((r) => setTimeout(r, 50));

      // 4) リダイレクト
      const next =
        resolvedRole === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
      console.log("[LOGIN] redirect ->", next);
      location.href = next;
    } catch (err) {
      console.error("[LOGIN] unexpected error", err);
      alert("想定外のエラーが発生しました");
      // クッキー未設定でもとりあえずダッシュに送る(ミドルウェアで戻される)
      const next = role === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
      location.href = next;
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary-500 text-white text-xl font-bold w-12 h-12 flex items-center justify-center rounded-full">
            医
          </div>
          <h1 className="text-xl font-bold mt-2 text-primary-700">医志マッチ</h1>
          <p className="text-text-muted text-sm">志に合う病院に出会える。</p>
        </div>

        {/* ロール切替（UIそのまま） */}
        <div className="flex mb-6 bg-primary-50 rounded-full p-1">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              role === "student" ? "bg-primary-500 text-white shadow" : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            学生様はこちら
          </button>
          <button
            type="button"
            onClick={() => setRole("hospital")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              role === "hospital" ? "bg-primary-500 text-white shadow" : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            病院様はこちら
          </button>
        </div>

        <h2 className="text-lg font-semibold text-primary-700">
          {role === "student" ? "学生ログイン" : "病院ログイン"}
        </h2>

        {/* フォーム（UIそのまま） */}
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
              placeholder={role === "student" ? "student@example.com" : "hospital@example.com"}
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
          <a href="/signup" className="text-primary-600 hover:underline">新規登録</a>
          <span>・</span>
          <a href="#" className="text-text-muted hover:underline">パスワードリセット</a>
        </div>
      </div>
    </main>
  );
}