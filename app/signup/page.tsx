"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase/client";

export default function SignupPage() {
  const supabase = createSupabaseBrowser();
  const [role, setRole] = useState<"student"|"hospital">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      // 1) Auth signUp（metadataに role/name を同時保存）
      const { data, error } = await supabase.auth.signUp({
        email, password: pwd,
        options: { data: { role, name } }
      });
      if (error) { alert(`登録に失敗：${error.message}`); setBusy(false); return; }

      const userId = data.user?.id;

      // 2) 個人行を“必ず”作る（ServiceRole）
      if (userId) {
        await fetch('/api/onboard', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ userId, role, email, name })
        });
      }

      // 3) Cookie 付与（middleware互換）
      await fetch('/api/session', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({ role, email })
      });

      await new Promise(r => setTimeout(r, 50));
      location.href = role === 'hospital' ? '/hospital/dashboard' : '/student/dashboard';
    } finally {
      setBusy(false);
    }
  };

  return (
    // --- UIは原文の通り（氏名/メール/パスワード + ロール切替 + ボタン） ---
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* …省略：原文UIそのまま… */}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 氏名/メール/パスワード入力 */}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "送信中..." : "登録して進む"}
          </button>
        </form>
      </div>
    </main>
  );
}