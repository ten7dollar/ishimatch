"use client";

import { useState } from "react";

const CATEGORIES = [
  "応募・面談について",
  "サイトの使い方について",
  "アカウントについて",
  "その他",
];

export default function ContactPage() {
  const [name, setName] = useState("山田太郎");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "ok" | "ng">(null);

  const submit = async () => {
    if (!name || !email || !message) {
      alert("必須項目（お名前・メール・内容）を入力してください");
      return;
    }
    try {
      setBusy(true); setDone(null);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed");
      setDone("ok"); setMessage(""); setCount(0);
    } catch (e:any) {
      setDone("ng");
      alert(e.message ?? "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">お問い合わせ</h1>
        <p className="text-gray-600">ご質問やご要望がございましたら、お気軽にお問い合わせください</p>
      </div>

      <section className="border rounded-xl bg-white p-6 space-y-4">
        <h2 className="font-semibold text-primary-700">お問い合わせフォーム</h2>
        <p className="text-sm text-gray-600">お問い合わせ内容を確認次第、担当者よりご連絡させていただきます</p>

        <div className="grid gap-4">
          <div>
            <label className="text-sm text-gray-600">お名前*</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="text-sm text-gray-600">メールアドレス*</label>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">お問い合わせ種別*</label>
            <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="" disabled>お問い合わせ内容を選択してください</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">お問い合わせ内容*</label>
            <textarea
              value={message}
              onChange={(e)=>{ setMessage(e.target.value); setCount(e.target.value.length); }}
              rows={8}
              maxLength={1000}
              placeholder="お問い合わせ内容をできるだけ詳しくご記入ください"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-right text-xs text-gray-500">{count}/1000文字</div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
            ご入力いただいた個人情報は、お問い合わせ対応の目的でのみ使用いたします。プライバシーポリシーについては、アカウント設定ページをご確認ください。
          </p>

          <div className="text-right">
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded hover:bg-primary-700"
            >
              ✉️ 送信する
            </button>
            {done === "ok" && <span className="ml-3 text-green-600 text-sm">送信しました。ありがとうございます。</span>}
            {done === "ng" && <span className="ml-3 text-red-600 text-sm">送信に失敗しました。時間をおいてお試しください。</span>}
          </div>
        </div>
      </section>

      {/* よくあるご質問 */}
      <section className="border rounded-xl bg-white p-6 space-y-3">
        <h3 className="font-semibold">よくあるご質問</h3>
        <div className="text-sm space-y-2 text-gray-700">
          <p><b>Q.</b> 返信までどのくらいかかりますか？<br/><b>A.</b> 通常3営業日以内にご登録のメールアドレスへ返信いたします。</p>
          <p><b>Q.</b> 病院への応募に関する質問は？<br/><b>A.</b> 応募・面談についてのお問い合わせは「応募・面談について」を選択してください。</p>
          <p><b>Q.</b> アカウント情報の変更方法は？<br/><b>A.</b> サイドメニューの「アカウント」から変更可能です。パスワード変更などもこちらから行えます。</p>
        </div>
      </section>
    </main>
  );
}