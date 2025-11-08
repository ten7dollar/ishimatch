"use client";

import { useState } from "react";

export default function AccountPage() {
  // 基本情報
  const [profile, setProfile] = useState({
    lastName: "医学",
    firstName: "太郎",
    email: "igaku.taro@example.com",
    university: "東京大学医学部",
    phone: "090-1234-5678",
    gradYear: "2026",
  });
  const [editProfile, setEditProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<null | "ok" | "ng">(null);

  // パスワード変更
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<null | "ok" | "ng">(null);

  // --- 将来 Supabase に置き換えるスケルトン ---
  async function updateProfile() {
    try {
      setSavingProfile(true);
      setProfile(profileDraft);      // ← 今はローカル反映のみ
      // 例）await supabase.from("students").update({...}).eq("id", user.id)
      setProfileMsg("ok");
      setEditProfile(false);
    } catch {
      setProfileMsg("ng");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (!pw.current || !pw.next || !pw.confirm) {
      alert("すべて入力してください"); return;
    }
    if (pw.next !== pw.confirm) {
      alert("新しいパスワードが一致しません"); return;
    }
    try {
      setChangingPw(true);
      // 例）await supabase.auth.updateUser({ password: pw.next })
      setPwMsg("ok");
      setPw({ current: "", next: "", confirm: "" });
      setPwOpen(false);
    } catch {
      setPwMsg("ng");
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">アカウント設定</h1>
      <p className="text-gray-600">プロフィール情報とセキュリティ設定を管理します</p>

      {/* プロフィール画像（UIのみ） */}
      <section className="border rounded-xl bg-white p-6 space-y-4">
        <h2 className="font-semibold text-primary-700">プロフィール画像</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 border flex items-center justify-center text-2xl text-gray-500">
            医
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer">
            <input type="file" className="hidden" onChange={() => alert("アップロード処理は後日実装")} />
            画像をアップロード
          </label>
          <p className="text-xs text-gray-500">推奨サイズ：400x400px、最大2MB</p>
        </div>
      </section>

      {/* 基本情報カード：閲覧 → 入力する → 保存/キャンセル */}
      <section className="border rounded-xl bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">基本情報</h3>

          {!editProfile ? (
            <button
              onClick={() => { setProfileDraft(profile); setEditProfile(true); setProfileMsg(null); }}
              className="text-sm px-3 py-1 rounded bg-primary-600 text-white"
            >
              入力する
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditProfile(false); setProfileDraft(profile); }}
                className="text-sm px-3 py-1 rounded border"
              >
                キャンセル
              </button>
              <button
                onClick={updateProfile}
                disabled={savingProfile}
                className="text-sm px-3 py-1 rounded bg-primary-600 text-white"
              >
                {savingProfile ? "保存中..." : "保存"}
              </button>
            </div>
          )}
        </div>

        {/* 表示 or 編集フォーム */}
        {!editProfile ? (
          <div className="grid md:grid-cols-2 gap-4">
            <ReadOnly label="氏名" value={`${profile.lastName} ${profile.firstName}`} />
            <ReadOnly label="メールアドレス*" value={profile.email} />
            <ReadOnly label="電話番号" value={profile.phone} />
            <ReadOnly label="大学" value={profile.university} />
            <ReadOnly label="卒業予定年" value={profile.gradYear} />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="姓" value={profileDraft.lastName} onChange={(v)=>setProfileDraft({...profileDraft, lastName:v})}/>
            <Field label="名" value={profileDraft.firstName} onChange={(v)=>setProfileDraft({...profileDraft, firstName:v})}/>
            <Field label="メールアドレス*" value={profileDraft.email} onChange={(v)=>setProfileDraft({...profileDraft, email:v})}/>
            <Field label="電話番号" value={profileDraft.phone} onChange={(v)=>setProfileDraft({...profileDraft, phone:v})}/>
            <Field label="大学" value={profileDraft.university} onChange={(v)=>setProfileDraft({...profileDraft, university:v})}/>
            <Field label="卒業予定年" value={profileDraft.gradYear} onChange={(v)=>setProfileDraft({...profileDraft, gradYear:v})}/>
          </div>
        )}

        {profileMsg === "ok" && <p className="text-green-600 text-sm">保存しました</p>}
        {profileMsg === "ng" && <p className="text-red-600 text-sm">保存に失敗しました</p>}
      </section>

      {/* パスワード変更カード：押してから展開 */}
      <section className="border rounded-xl bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">パスワード変更</h3>
          {!pwOpen ? (
            <button onClick={()=>{ setPwOpen(true); setPwMsg(null); }} className="text-sm px-3 py-1 rounded bg-primary-600 text-white">
              パスワードを変更する
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={()=>{ setPwOpen(false); setPw({current:"", next:"", confirm:""}); }} className="text-sm px-3 py-1 rounded border">
                キャンセル
              </button>
              <button onClick={changePassword} disabled={changingPw} className="text-sm px-3 py-1 rounded bg-primary-600 text-white">
                {changingPw ? "変更中..." : "保存"}
              </button>
            </div>
          )}
        </div>

        {pwOpen && (
          <div className="grid md:grid-cols-3 gap-4">
            <PasswordField label="現在のパスワード*" value={pw.current} onChange={(v)=>setPw({...pw, current:v})}/>
            <PasswordField label="新しいパスワード*" value={pw.next} onChange={(v)=>setPw({...pw, next:v})}/>
            <PasswordField label="新しいパスワード（確認）*" value={pw.confirm} onChange={(v)=>setPw({...pw, confirm:v})}/>
          </div>
        )}

        {pwMsg === "ok" && <p className="text-green-600 text-sm">変更しました</p>}
        {pwMsg === "ng" && <p className="text-red-600 text-sm">変更に失敗しました</p>}
      </section>
    </main>
  );
}

/* ------- 小さな部品 ------- */
function ReadOnly({ label, value }: { label:string; value:string }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input value={value} readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
    </div>
  );
}
function Field({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input value={value} onChange={(e)=>onChange(e.target.value)} className="w-full border rounded px-3 py-2" />
    </div>
  );
}
function PasswordField({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input type="password" value={value} onChange={(e)=>onChange(e.target.value)} className="w-full border rounded px-3 py-2" />
    </div>
  );
}