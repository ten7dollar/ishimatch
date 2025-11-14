"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Save, Pencil, CheckCircle } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type HospitalAccountRow = {
  id: string;
  contact_name: string | null;
  contact_tel: string | null;
  contact_email: string | null;
  hospital_name: string | null;
};

export default function HospitalAccountPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [editingSection, setEditingSection] = useState<"rep" | "contact" | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [uid, setUid] = useState<string>("");

  // 代表者情報
  const [rep, setRep] = useState({ name: "", title: "", phone: "", email: "" });
  // 採用連絡先
  const [contact, setContact] = useState({ department: "", recruitEmail: "" });

  const handleSaveToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  /** 初期値読み込み（auth + hospital_accounts） */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);

      // hospital_accounts の自分のレコード
      const { data: haRow, error: haErr } = await supabase
        .from("hospital_accounts")
        .select("contact_name, contact_tel, contact_email, hospital_name")
        .eq("id", user.id)
        .maybeSingle();

      if (haErr) {
        console.error("[account] load hospital_accounts error:", haErr.message);
      }

      // metadata（部署・役職・電話など補助）
      const meta = user.user_metadata ?? {};

      setRep({
        name: (haRow?.contact_name ?? (meta.name as string) ?? "") as string,
        title: (meta.title as string) ?? "",
        phone: (haRow?.contact_tel ?? (meta.phone as string) ?? "") as string,
        email: (haRow?.contact_email ?? user.email ?? "") as string,
      });

      setContact({
        department: (meta.department as string) ?? "",
        recruitEmail: (haRow?.contact_email ?? (meta.recruit_email as string) ?? "") as string,
      });

      // レコードが無ければ空で作成（RLS: self_insert/upsert が必要）
      if (!haRow) {
        const { error: upErr } = await supabase.from("hospital_accounts").upsert({ id: user.id });
        if (upErr) console.warn("[account] upsert empty row:", upErr.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 代表者情報 保存 */
  const saveRep = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      // 1) hospital_accounts を更新
      const { error: e1 } = await supabase
        .from("hospital_accounts")
        .update({
          contact_name: rep.name || null,
          contact_tel: rep.phone || null,
          contact_email: rep.email || null,
        })
        .eq("id", uid);
      if (e1) throw e1;

      // 2) auth.user（metadata + email 変更）
      const payload: any = {
        data: {
          name: rep.name || null,
          title: rep.title || null,
          phone: rep.phone || null,
        },
      };
      // メールアドレス変更を許可（環境設定により確認メールが飛びます）
      const { data: { user } } = await supabase.auth.getUser();
      if (user && rep.email && rep.email !== user.email) {
        payload.email = rep.email;
      }
      const { error: e2 } = await supabase.auth.updateUser(payload);
      if (e2) throw e2;

      handleSaveToast();
      setEditingSection(null);
    } catch (e: any) {
      console.error("[account] saveRep error:", e?.message);
      alert(`保存に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  /** 採用連絡先 保存（部署は metadata、メールは hospital_accounts.contact_email にも反映） */
  const saveContact = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      // 1) auth metadata（部署／採用窓口メール）
      const { error: e1 } = await supabase.auth.updateUser({
        data: {
          department: contact.department || null,
          recruit_email: contact.recruitEmail || null,
        },
      });
      if (e1) throw e1;

      // 2) hospital_accounts 側の連絡先メールも揃える
      const { error: e2 } = await supabase
        .from("hospital_accounts")
        .update({ contact_email: contact.recruitEmail || null })
        .eq("id", uid);
      if (e2) throw e2;

      handleSaveToast();
      setEditingSection(null);
    } catch (e: any) {
      console.error("[account] saveContact error:", e?.message);
      alert(`保存に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  /** パスワード保存 */
  const changePassword = async () => {
    const next = (document.getElementById("newpw") as HTMLInputElement)?.value || "";
    if (!next) return;
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      handleSaveToast();
      setShowPasswordFields(false);
    } catch (e: any) {
      console.error("[account] changePassword error:", e?.message);
      alert(`パスワード変更に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* ===== タイトル ===== */}
      <div>
        <h1>アカウント管理</h1>
        <p className="text-text-muted">病院情報とアカウント設定を管理します。</p>
      </div>

      {/* ===== 代表者情報 ===== */}
      <section className="card p-6 space-y-4 relative">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">代表者情報</h2>
          {editingSection === "rep" ? (
            <button
              onClick={saveRep}
              disabled={saving}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> {saving ? "保存中…" : "保存"}
            </button>
          ) : (
            <button
              onClick={() => setEditingSection("rep")}
              className="flex items-center text-primary-600 text-sm hover:underline"
            >
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <p className="text-text-muted text-sm">病院の代表者・担当者情報を入力してください</p>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Field
            label="氏名"
            placeholder="例：山田太郎"
            value={rep.name}
            setValue={(v) => setRep((s) => ({ ...s, name: v }))}
            disabled={editingSection !== "rep"}
          />
          <Field
            label="役職"
            placeholder="例：採用担当課長"
            value={rep.title}
            setValue={(v) => setRep((s) => ({ ...s, title: v }))}
            disabled={editingSection !== "rep"}
          />
          <Field
            label="電話番号"
            placeholder="例：03-1234-5678"
            value={rep.phone}
            setValue={(v) => setRep((s) => ({ ...s, phone: v }))}
            disabled={editingSection !== "rep"}
          />
          <Field
            label="メールアドレス"
            placeholder="例：yamada@hospital.jp"
            value={rep.email}
            setValue={(v) => setRep((s) => ({ ...s, email: v }))}
            disabled={editingSection !== "rep"}
          />
        </div>
      </section>

      {/* ===== 採用連絡先 ===== */}
      <section className="card p-6 space-y-4 relative">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">採用連絡先</h2>
          {editingSection === "contact" ? (
            <button
              onClick={saveContact}
              disabled={saving}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> {saving ? "保存中…" : "保存"}
            </button>
          ) : (
            <button
              onClick={() => setEditingSection("contact")}
              className="flex items-center text-primary-600 text-sm hover:underline"
            >
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <p className="text-text-muted text-sm">学生への通知送信先となる連絡先を設定してください</p>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Field
            label="部署名"
            placeholder="例：人事部"
            value={contact.department}
            setValue={(v) => setContact((s) => ({ ...s, department: v }))}
            disabled={editingSection !== "contact"}
          />
          <Field
            label="採用窓口メール"
            placeholder="例：recruit@hospital.jp"
            value={contact.recruitEmail}
            setValue={(v) => setContact((s) => ({ ...s, recruitEmail: v }))}
            disabled={editingSection !== "contact"}
          />
        </div>
      </section>

      {/* ===== 通知設定（UIそのまま / 保存なし） ===== */}
      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">通知設定</h2>
        <p className="text-text-muted text-sm">メール通知を受け取るイベントを選択してください</p>

        {[
          { label: "応募通知", desc: "学生から新しい応募があった時" },
          { label: "閲覧通知", desc: "学生があなたの病院情報を閲覧した時" },
          { label: "お気に入り通知", desc: "学生があなたの病院をお気に入りに追加した時" },
          { label: "面談返信通知", desc: "面談打診に対して学生から返信があった時" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between border rounded-md px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-text">{item.label}</p>
              <p className="text-text-muted text-xs">{item.desc}</p>
            </div>
            <input type="checkbox" className="accent-primary-500 h-5 w-5" defaultChecked />
          </div>
        ))}
      </section>

      {/* ===== パスワード変更 ===== */}
      <section className="card p-6 space-y-4 relative">
        <h2 className="text-lg font-semibold text-primary-700">ログイン情報</h2>
        <p className="text-text-muted text-sm">パスワードを変更できます</p>

        {showPasswordFields ? (
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-text-muted mb-1">現在のパスワード</label>
              <input
                type="password"
                placeholder="現在のパスワードを入力"
                className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1">新しいパスワード</label>
              <input
                id="newpw"
                type="password"
                placeholder="新しいパスワードを入力"
                className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300 placeholder:text-gray-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasswordFields(false)}
                className="border border-gray-300 text-gray-600 rounded-md px-4 py-1 text-sm hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={changePassword}
                disabled={saving}
                className="bg-primary-500 text-white text-sm px-4 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
              >
                <Save className="w-4 h-4" /> 保存
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border rounded-md px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-text">パスワード</p>
              <p className="text-text-muted text-xs">最終更新日：—</p>
            </div>
            <button
              onClick={() => setShowPasswordFields(true)}
              className="border border-primary-500 text-primary-600 rounded-md px-4 py-1 text-sm flex items-center gap-1 hover:bg-primary-50 transition"
            >
              <Lock className="w-4 h-4" /> 変更
            </button>
          </div>
        )}

        {/* ✅ 保存完了トースト */}
        {showToast && (
          <div className="absolute bottom-4 right-6 bg-green-100 text-green-700 text-sm rounded-md px-4 py-2 flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>変更が保存されました</span>
          </div>
        )}
      </section>
    </main>
  );
}

/* 小さな部品 */
function Field({
  label,
  placeholder,
  value,
  setValue,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block text-text-muted mb-1">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className={`w-full border rounded-md px-3 py-2 text-sm placeholder:text-gray-400 ${
          disabled
            ? "bg-gray-50 text-gray-500"
            : "focus:ring focus:ring-primary-300 focus:border-primary-400"
        }`}
      />
    </div>
  );
}