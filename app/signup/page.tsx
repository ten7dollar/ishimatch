"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function SignupPage() {
  const supabase = createSupabaseBrowser();
  const [role,setRole] = useState<"student"|"hospital">("student");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [pwd,setPwd] = useState("");
  const [busy,setBusy] = useState(false);

  const onSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true);

    // 1) Supabase にアカウント作成（メタデータに role/name）
    const { error } = await supabase.auth.signUp({
      email, password: pwd, options: { data: { role, name } }
    });
    setBusy(false);
    if (error) return alert("登録に失敗しました：" + error.message);

    // 2) 自分のプロフィール行を作成（RLSで本人のみ許可）
    const { data:{ user } } = await supabase.auth.getUser();
    if (user) {
      if (role === "student") {
        await supabase.from("students").upsert({ id:user.id, email, name: name || null });
      } else {
        await supabase.from("hospital_accounts").upsert({
          id:user.id, email, contact_name: name || null, hospital_name: null
        });
      }
    } else {
      // メール確認ONの場合はここで user==null になるので、そのまま案内
      alert("登録メールを送信しました。メールの確認後にログインしてください。");
      location.href = "/login";
      return;
    }

    // 3) 既存ミドルウェア互換：role クッキーを付与
    await fetch("/api/session", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ role, email })
    });

    // 4) ダッシュへ
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

        {/* ロール切替（既存UIのまま） */}
        <div className="flex mb-6 bg-primary-50 rounded-full p-1">
          <button onClick={()=>setRole("student")}
            className={`flex-1 py-2 rounded-full font-medium transition ${role==="student"?"bg-primary-500 text-white shadow":"text-primary-700 hover:bg-primary-100"}`}>
            学生様はこちら
          </button>
          <button onClick={()=>setRole("hospital")}
            className={`flex-1 py-2 rounded-full font-medium transition ${role==="hospital"?"bg-primary-500 text-white shadow":"text-primary-700 hover:bg-primary-100"}`}>
            病院様はこちら
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-3 text-primary-700">{role==="student"?"学生登録":"病院登録"}</h2>

        {/* 登録フォーム */}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1 text-text-muted">氏名 / 担当者名</label>
            <input
              type="text" value={name} onChange={(e)=>setName(e.target.value)}
              placeholder={role==="student"?"例：山田 太郎":"例：採用担当 佐藤"}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">メールアドレス</label>
            <input
              type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
              placeholder={role==="student"?"student@example.com":"hospital@example.com"}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">パスワード</label>
            <input
              type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)}
              placeholder="8文字以上で入力"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-primary-300"
            />
          </div>

          <button disabled={busy} className="btn btn-primary w-full">
            {busy ? "登録中..." : "登録してログイン"}
          </button>
        </form>

        <div className="text-center text-sm mt-4">
          <a href="/login" className="text-primary-600 hover:underline">ログインはこちら</a>
        </div>
      </div>
    </main>
  );
}