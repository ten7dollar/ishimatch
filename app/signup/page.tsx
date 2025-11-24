"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  // サインアップは学生専用
  const role: "student" = "student";

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

      // 2) students に行を作成（Service Role API）
      if (userId) {
        await fetch("/api/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role, email, name }),
        }).catch(() => {});
      }

      // 3) middleware 用 Cookie 設定
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, email }),
      }).catch(() => {});

      await new Promise((r) => setTimeout(r, 60));

      // 4) 学生オンボーディングへ
      router.replace("/student/onboarding");
    } finally {
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
          <p className="text-text-muted text-sm mt-2">初期研修医マッチングプラットフォーム</p>
        </div>

        <h2 className="text-lg font-semibold mb-3 text-primary-700 text-center">
          学生アカウント登録
        </h2>
        <p className="text-sm text-text-muted text-center mb-6">
          初期研修先を探している医学生の方はこちらから無料で登録できます。
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">氏名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
              placeholder="山田 太郎"
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
              placeholder="student@example.com"
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