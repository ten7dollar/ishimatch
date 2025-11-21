"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // 基本情報（原文フィールド名を維持）
  const [profile, setProfile] = useState({
    lastName: "",
    firstName: "",
    email: "",
    university: "",
    phone: "",
    gradYear: "",
  });
  const [editProfile, setEditProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<null | "ok" | "ng">(null);

  // パスワード変更（原文UXのまま）
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<null | "ok" | "ng">(null);

  // ▼ 追加：アバター
  const [uid, setUid] = useState<string>("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);      // DBに保存している storage のパス
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null); // 表示用の署名付きURL

  // 署名付きURLを解決
  const resolveSignedAvatarUrl = async (path: string) => {
    const { data, error } = await supabase
      .storage
      .from("avatars")
      .createSignedUrl(path, 60 * 10); // 10分だけ有効
    if (!error && data?.signedUrl) setAvatarPreviewUrl(data.signedUrl);
  };

  // 初期ロード：auth + students を統合して profile へ
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);

      // Auth 情報
      const email = user.email ?? "";
      const metaName = (user.user_metadata?.name as string | undefined) ?? "";
      const phone = (user.user_metadata?.phone as string | undefined) ?? "";

      // 名前を姓/名に分割
      let lastName = "";
      let firstName = "";
      if (metaName) {
        const parts = metaName.trim().split(/\s+/);
        if (parts.length >= 2) {
          lastName = parts[0];
          firstName = parts.slice(1).join(" ");
        } else {
          lastName = metaName;
        }
      }

      // students テーブル
      const { data: s } = await supabase
        .from("students")
        .select("name, university, grad_year, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (s?.name && !metaName) {
        const parts = s.name.trim().split(/\s+/);
        if (parts.length >= 2) {
          lastName = parts[0];
          firstName = parts.slice(1).join(" ");
        } else {
          lastName = s.name;
        }
      }
      const university = s?.university ?? "";
      const gradYear = s?.grad_year ? String(s.grad_year) : "";

      const init = { lastName, firstName, email, university, phone, gradYear };
      setProfile(init);
      setProfileDraft(init);

      // ▼ 追加：アバタープレビューを解決
      if (s?.avatar_url) {
        setAvatarPath(s.avatar_url);
        await resolveSignedAvatarUrl(s.avatar_url);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Supabase 保存（UIは原文のまま） ---
  async function updateProfile() {
    try {
      setSavingProfile(true);
      setProfileMsg(null);

      const fullName =
        [profileDraft.lastName, profileDraft.firstName]
          .filter(Boolean)
          .join(" ")
          .trim() || null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");

      // 1) students 更新（自分の行のみ／RLS前提）
      {
        const { error: upsertErr } = await supabase
          .from("students")
          .upsert({
            id: user.id,
            name: fullName,
            university: profileDraft.university || null,
            grad_year: profileDraft.gradYear
              ? Number(profileDraft.gradYear)
              : null,
          });
        if (upsertErr) throw upsertErr;
      }

      // 2) Auth metadata 更新（name/phone）
      {
        const metaPayload: { data: Record<string, unknown>; email?: string } = {
          data: {
            name: fullName || undefined,
            phone: profileDraft.phone || undefined,
          },
        };
        const { data: { user } } = await supabase.auth.getUser();
        if (user && profileDraft.email && profileDraft.email !== profile.email) {
          metaPayload.email = profileDraft.email; // 必要ならメールも更新
        }
        const { error: metaErr } = await supabase.auth.updateUser(metaPayload);
        if (metaErr) throw metaErr;
      }

      setProfile(profileDraft);
      setProfileMsg("ok");
      setEditProfile(false);
    } catch (e) {
      console.error("[Account] updateProfile error", e);
      setProfileMsg("ng");
    } finally {
      setSavingProfile(false);
    }
  }

  // ▼ 追加：アバターアップロード
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${uid}/avatar.${ext}`;

    // upsert で常に上書き
    const { error: upErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      alert(`アップロードに失敗しました：${upErr.message}`);
      return;
    }

    // DB に保存
    await supabase
      .from("students")
      .update({ avatar_url: path })
      .eq("id", uid);

    setAvatarPath(path);
    await resolveSignedAvatarUrl(path);
  }

  // ▼ 追加：アバター削除
  async function handleAvatarDelete() {
    if (!uid || !avatarPath) return;
    const { error: delErr } = await supabase.storage.from("avatars").remove([avatarPath]);
    if (delErr) {
      alert(`削除に失敗しました：${delErr.message}`);
      return;
    }
    await supabase.from("students").update({ avatar_url: null }).eq("id", uid);
    setAvatarPath(null);
    setAvatarPreviewUrl(null);
  }

  async function changePassword() {
    if (!pw.current || !pw.next || !pw.confirm) {
      alert("すべて入力してください");
      return;
    }
    if (pw.next !== pw.confirm) {
      alert("新しいパスワードが一致しません");
      return;
    }
    try {
      setChangingPw(true);
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
      setPwMsg("ok");
      setPw({ current: "", next: "", confirm: "" });
      setPwOpen(false);
    } catch (e) {
      console.error("[Account] changePassword error", e);
      setPwMsg("ng");
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">アカウント設定</h1>
      <p className="text-gray-600">プロフィール情報とセキュリティ設定を管理します</p>

      {/* プロフィール画像 */}
      <section className="border rounded-xl bg-white p-6 space-y-4">
        <h2 className="font-semibold text-primary-700">プロフィール画像</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 border overflow-hidden">
            {avatarPreviewUrl ? (
              // 署名付きURLで表示（10分で失効。必要なら再取得）
              <img
                src={avatarPreviewUrl}
                alt="avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatarPreviewUrl(null)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500">
                {profile.lastName ? profile.lastName[0] : "医"}
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            画像をアップロード
          </label>

          {avatarPath && (
            <button
              onClick={handleAvatarDelete}
              className="text-sm text-red-600 hover:underline"
            >
              削除
            </button>
          )}

          <p className="text-xs text-gray-500">推奨サイズ：400x400px、最大2MB</p>
        </div>
      </section>

      {/* 基本情報カード：閲覧 → 入力する → 保存/キャンセル */}
      <section className="border rounded-xl bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">基本情報</h3>

          {!editProfile ? (
            <button
              onClick={() => {
                setProfileDraft(profile);
                setEditProfile(true);
                setProfileMsg(null);
              }}
              className="text-sm px-3 py-1 rounded bg-primary-600 text-white"
            >
              入力する
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditProfile(false);
                  setProfileDraft(profile);
                }}
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
            <Field label="姓" value={profileDraft.lastName} onChange={(v) => setProfileDraft({ ...profileDraft, lastName: v })} />
            <Field label="名" value={profileDraft.firstName} onChange={(v) => setProfileDraft({ ...profileDraft, firstName: v })} />
            <Field label="メールアドレス*" value={profileDraft.email} onChange={(v) => setProfileDraft({ ...profileDraft, email: v })} />
            <Field label="電話番号" value={profileDraft.phone} onChange={(v) => setProfileDraft({ ...profileDraft, phone: v })} />
            <Field label="大学" value={profileDraft.university} onChange={(v) => setProfileDraft({ ...profileDraft, university: v })} />
            <Field label="卒業予定年" value={profileDraft.gradYear} onChange={(v) => setProfileDraft({ ...profileDraft, gradYear: v })} />
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
            <button
              onClick={() => {
                setPwOpen(true);
                setPwMsg(null);
              }}
              className="text-sm px-3 py-1 rounded bg-primary-600 text-white"
            >
              パスワードを変更する
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPwOpen(false);
                  setPw({ current: "", next: "", confirm: "" });
                }}
                className="text-sm px-3 py-1 rounded border"
              >
                キャンセル
              </button>
              <button
                onClick={changePassword}
                disabled={changingPw}
                className="text-sm px-3 py-1 rounded bg-primary-600 text-white"
              >
                {changingPw ? "変更中..." : "保存"}
              </button>
            </div>
          )}
        </div>

        {pwOpen && (
          <div className="grid md:grid-cols-3 gap-4">
            <PasswordField label="現在のパスワード*" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
            <PasswordField label="新しいパスワード*" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} />
            <PasswordField label="新しいパスワード（確認）*" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} />
          </div>
        )}

        {pwMsg === "ok" && <p className="text-green-600 text-sm">変更しました</p>}
        {pwMsg === "ng" && <p className="text-red-600 text-sm">変更に失敗しました</p>}
      </section>
    </main>
  );
}

/* ------- 小さな部品（原文そのまま） ------- */
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input value={value || ""} readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded px-3 py-2" />
    </div>
  );
}
function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded px-3 py-2" />
    </div>
  );
}