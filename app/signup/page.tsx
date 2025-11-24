"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [role, setRole] = useState<"student" | "hospital">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      // 1) Supabase でユーザー作成（metadata に role / name を付与）
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pwd,
        options: {
          data: { role, name },
        },
      });
      if (error) {
        alert(`登録に失敗しました：${error.message}`);
        setBusy(false);
        return;
      }

      const userId = data.user?.id ?? null;

      // 2) 個人DB行を“必ず”作成（Service Role API）
      //    - students または hospital_accounts に行を作る
      if (userId) {
        await fetch("/api/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role, email, name }),
        }).catch(() => {});
      }

      // 3) middleware 互換：role/email を Cookie に付与（always include）
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, email }),
      }).catch(() => {});

      // Cookie 反映待ち
      await new Promise((r) => setTimeout(r, 60));

      // 4) 遷移
      // 学生はオンボーディングに。病院はダッシュボード（必要なら /hospital/onboarding に差し替え可）
      if (role === "student") {
        router.replace("/student/onboarding");
      } else {
        router.replace("/hospital/dashboard");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* ==== ブランド（ロゴ）: ログイン画面と統一 ==== */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/brand/regimatch-logo.svg"
            alt="レジマッチ"
            height={44}
            width={123}
            priority
          />
          <p className="text-text-muted text-sm mt-2">初期研修医マッチングプラットフォーム</p>
        </div>

        {/* ロール切替 */}
        <div className="flex mb-6 bg-primary-50 rounded-full p-1">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              role === "student"
                ? "bg-primary-500 text-white shadow"
                : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            学生様はこちら
          </button>
          <button
            type="button"
            onClick={() => setRole("hospital")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              role === "hospital"
                ? "bg-primary-500 text-white shadow"
                : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            病院様はこちら
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-3 text-primary-700">
          {role === "student" ? "学生アカウント登録" : "病院アカウント登録"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">氏名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              placeholder={role === "student" ? "山田 太郎（学生担当者名）" : "山田 太郎（採用担当者名）"}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">メールアドレス</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              type="email"
              placeholder={role === "student" ? "student@example.com" : "hospital@example.com"}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">パスワード</label>
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

        <div className="text-center text-sm mt-4">
          <span className="text-text-muted mr-1">すでにアカウントをお持ちの方は</span>
          <a href="/login" className="text-primary-600 hover:underline">
            ログインはこちら
          </a>
        </div>
      </div>
    </main>
  );
}