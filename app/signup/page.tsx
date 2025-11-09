"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function SignupPage() {
  const supabase = createSupabaseBrowser();

  const [role, setRole] = useState<"student" | "hospital">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    // 1) Supabaseでユーザー作成
    const { error } = await supabase.auth.signUp({ email, password: pwd });
    if (error) {
      setBusy(false);
      alert(`登録に失敗しました：${error.message}`);
      return;
    }

    // 2) user 取得
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 3) プロファイル保存（学生：students、病院：将来 hospital_accounts 等）
    try {
      const fullName = name?.trim() ? name : null;

      if (role === "student") {
        await supabase.from("students").upsert({
          id: user?.id,
          name: fullName,
          university: null,
          grad_year: gradYear ? Number(gradYear) : null,
        });
      } else {
        // 病院側は必要に応じて作成（例）
        // await supabase.from("hospital_accounts").upsert({ id:user?.id, contact_name: fullName });
      }

      // user_metadata に role/name を記録（未設定なら）
      await supabase.auth.updateUser({
        data: { role, displayName: fullName ?? undefined },
      }).catch(() => {});
    } catch {}

    // 4) 既存middleware互換：role/email を Cookie にセット
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ★ 必須
      body: JSON.stringify({ role, email }),
    }).catch(() => {});

    await new Promise((r) => setTimeout(r, 50)); // ★ 反映待ち
    setBusy(false);

    // 5) 遷移
    location.href = role === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary-500 text-white text-xl font-bold w-12 h-12 flex items-center justify-center rounded-full">医</div>
          <h1 className="text-xl font-bold mt-2 text-primary-700">医志マッチ</h1>
          <p className="text-text-muted text-sm">志に合う病院に出会える。</p>
        </div>

        {/* ロール切替 */}
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

        <h2 className="text-lg font-semibold mb-3 text-primary-700">アカウント情報</h2>

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
            <label className="block text-sm text-text-muted">卒業予定年（任意）</label>
            <input
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              placeholder="2026"
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