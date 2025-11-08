"use client";
import { useState } from "react";

export default function LoginPage() {
  const [role, setRole] = useState<"student" | "hospital">("student");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // MVP: パスワードは検証せず cookie セットのみ
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, email }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert("ログインに失敗しました");
      return;
    }
    location.href = role === "student" ? "/student/dashboard" : "/hospital/dashboard";
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

        {/* ロール切り替え */}
        <div className="flex mb-6 bg-primary-50 rounded-full p-1">
          <button
            onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              role === "student" ? "bg-primary-500 text-white shadow" : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            学生様はこちら
          </button>
          <button
            onClick={() => setRole("hospital")}
            className={`flex-1 py-2 rounded-full font-medium transition ${
              role === "hospital" ? "bg-primary-500 text-white shadow" : "text-primary-700 hover:bg-primary-100"
            }`}
          >
            病院様はこちら
          </button>
        </div>

        {/* ログインフォーム */}
        <h2 className="text-lg font-semibold mb-3 text-primary-700">
          {role === "student" ? "学生ログイン" : "病院ログイン"}
        </h2>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1 text-text-muted">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder={role === "student" ? "student@example.com" : "hospital@example.com"}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">パスワード</label>
            <input
              type="password"
              value={pwd}
              onChange={(e)=>setPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-primary-300"
            />
          </div>

          <button type="submit"
            className="w-full bg-primary-500 text-white rounded-md py-2 font-medium hover:bg-primary-600 active:bg-primary-700 transition">
            ログイン
          </button>
        </form>

        {/* 下部リンク */}
        <div className="text-center text-sm mt-4 space-x-2">
          <a href="/signup" className="text-primary-600 hover:underline">新規登録</a>
          <span>・</span>
          <a href="#" className="text-text-muted hover:underline">パスワードリセット</a>
        </div>
      </div>
    </main>
  );
}