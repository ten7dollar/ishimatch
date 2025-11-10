"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function SignupPage() {
  const supabase = createSupabaseBrowser();

  const [role, setRole] = useState<"student" | "hospital">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    console.log("[SIGNUP] submit start", { email, role });

    try {
      // 1) Supabase でユーザー作成
      const { error } = await supabase.auth.signUp({ email, password: pwd });
      if (error) {
        console.error("[SIGNUP] supabase signUp error", error);
        alert(`登録に失敗しました：${error.message}`);
        setBusy(false);
        return;
      }
      console.log("[SIGNUP] supabase signUp OK");

      // 2) user を取得し、Auth metadata + profile テーブルに保存
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const fullName = name?.trim() ? name : null;

      // (a) Auth の metadata に role / name を保存（ここは Promise なので await できる）
      try {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { role, name: fullName || undefined },
        });
        if (metaErr) console.warn("[SIGNUP] updateUser metadata error", metaErr);
      } catch (err) {
        console.warn("[SIGNUP] updateUser metadata unexpected error", err);
      }

      // (b) students/hospital_accounts 等の profile へ保存
      try {
        if (user?.id) {
          if (role === "student") {
            // PostgrestQueryBuilder は .catch() を持たないため、await + try/catch で扱う
            const { error: upsertErr } = await supabase
              .from("students")
              .upsert({ id: user.id, name: fullName, email });

            if (upsertErr) console.error("[SIGNUP] students upsert error", upsertErr);
          } else {
            // 病院側を使う場合はこちらで upsert
            // const { error: upsertErr } = await supabase
            //   .from("hospital_accounts")
            //   .upsert({ id: user.id, contact_name: fullName, email });
            // if (upsertErr) console.error("[SIGNUP] hospital_accounts upsert error", upsertErr);
          }
        }
      } catch (err) {
        console.warn("[SIGNUP] profile upsert unexpected error", err);
      }

      // 3) /api/session にクッキー設定（middleware 互換）
      const resp = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ★ Cookie を確実に付与
        body: JSON.stringify({ role, email }),
      });
      console.log("[SIGNUP] /api/session POST status", resp.status);

      // Set-Cookie 反映待ち
      await new Promise((r) => setTimeout(r, 50));

      // 4) ロール別に遷移（UI は原文のまま）
      const next = role === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
      console.log("[SIGNUP] redirect ->", next);
      location.href = next;
    } catch (err) {
      console.error("[SIGNUP] unexpected error", err);
      // 万一でも遷移はさせる（ミドルウェアで戻される）
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

        <h2 className="text-lg font-semibold text-primary-700">アカウント情報</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted">氏名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              placeholder="山田 太郎"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted">メールアドレス</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              type="email"
              placeholder="sample@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted">パスワード</label>
            <input
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              type="password"
              placeholder="8文字以上"
              required
            />
          </div>

        <button className="btn-primary w-full" disabled={busy}>
            {busy ? "送信中..." : "登録して進む"}
          </button>
        </form>
      </div>
    </main>
  );
}