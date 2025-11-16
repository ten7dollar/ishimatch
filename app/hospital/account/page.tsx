"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Save, Pencil, CheckCircle } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type HospitalAccountRow = {
  id: string;
  hospital_id: string | null;
  hospital_name: string | null;

  contact_name: string | null;
  contact_tel: string | null;
  contact_email: string | null;

  is_published: boolean | null;
};

export default function HospitalAccountPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [uid, setUid] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [editingSection, setEditingSection] = useState<"rep" | "contact" | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // 代表者情報
  const [rep, setRep] = useState({ name: "", title: "", phone: "", email: "" });
  // 採用連絡先
  const [contact, setContact] = useState({ department: "", recruitEmail: "" });
  // 公開フラグ
  const [isPublished, setIsPublished] = useState<boolean>(true);

  const handleSaveToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  /** 初期ロード（auth + hospital_accounts） */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);

      // hospital_accounts の自分のレコード（無ければ作る）
      const { data: haRow, error: haErr } = await supabase
        .from("hospital_accounts")
        .select("id,hospital_id,hospital_name,contact_name,contact_tel,contact_email,is_published")
        .eq("id", user.id)
        .maybeSingle();

      if (haErr) {
        console.error("[account] load hospital_accounts error:", haErr.message);
      }

      // メタデータ（役職・部署などは metadata を補助的に）
      const meta = user.user_metadata ?? {};

      // レコードが無ければ空で作成（RLS: self_insert/upsert が必要）
      if (!haRow) {
        const { error: upErr } = await supabase
          .from("hospital_accounts")
          .upsert({ id: user.id, hospital_id: user.id, is_published: true });
        if (upErr) console.warn("[account] upsert empty row:", upErr.message);
      } else {
        // hospital_id が未設定なら id を既定で紐付け（初回の保険）
        if (!haRow.hospital_id) {
          const { error: linkErr } = await supabase
            .from("hospital_accounts")
            .update({ hospital_id: user.id })
            .eq("id", user.id);
          if (linkErr) console.warn("[account] link hospital_id fallback:", linkErr.message);
        }
      }

      // もう一度最新を読む
      const { data: ha, error: reErr } = await supabase
        .from("hospital_accounts")
        .select("id,hospital_id,hospital_name,contact_name,contact_tel,contact_email,is_published")
        .eq("id", user.id)
        .maybeSingle();
      if (reErr) console.error("[account] reload error:", reErr.message);

      setRep({
        name : (ha?.contact_name ?? (meta.name as string) ?? "") as string,
        title: (meta.title as string) ?? "",
        phone: (ha?.contact_tel ?? (meta.phone as string) ?? "") as string,
        email: (ha?.contact_email ?? user.email ?? "") as string,
      });

      setContact({
        department  : (meta.department as string) ?? "",
        recruitEmail: (ha?.contact_email ?? (meta.recruit_email as string) ?? "") as string,
      });

      setIsPublished(ha?.is_published ?? true);
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
          contact_name : rep.name || null,
          contact_tel  : rep.phone || null,
          contact_email: rep.email || null,
        })
        .eq("id", uid);
      if (e1) throw e1;

      // 2) auth.user（metadata + email 変更反映）
      const payload: any = {
        data: {
          name : rep.name || null,
          title: rep.title || null,
          phone: rep.phone || null,
        },
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (user && rep.email && rep.email !== user.email) {
        payload.email = rep.email; // メール変更を許可（プロジェクト設定で確認メールの挙動に依存）
      }
      const { error: e2 } = await supabase.auth.updateUser(payload);
      if (e2) throw e2;

      setEditingSection(null);
      handleSaveToast();
    } catch (e: any) {
      console.error("[account] saveRep error:", e?.message);
      alert(`保存に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  /** 採用連絡先 保存（metadata と hospital_accounts.contact_email を揃える） */
  const saveContact = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      // 1) auth metadata（部署／採用窓口メール）
      const { error: e1 } = await supabase.auth.updateUser({
        data: {
          department   : contact.department || null,
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

      setEditingSection(null);
      handleSaveToast();
    } catch (e: any) {
      console.error("[account] saveContact error:", e?.message);
      alert(`保存に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  /** 公開フラグの切替（is_published） */
  const togglePublish = async () => {
    if (!uid) return;
    const next = !isPublished;
    setIsPublished(next); // 楽観反映
    try {
      const { error } = await supabase
        .from("hospital_accounts")
        .update({ is_published: next })
        .eq("id", uid);
      if (error) throw error;
      handleSaveToast();
    } catch (e: any) {
      console.error("[account] togglePublish error:", e?.message);
      setIsPublished(!next); // 戻す
      alert(`公開設定の変更に失敗しました：${e?.message ?? "unknown"}`);
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
      setShowPasswordFields(false);
      handleSaveToast();
    } catch (e: any) {
      console.error("[account] changePassword error:", e?.message);
      alert(`パスワード変更に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  /** 公開状態ラベル */
  const pubLabel = isPublished ? "公開中" : "非公開";
  const pubDot   = isPublished ? "bg-green-500"  : "bg-orange-400";
  const pubText  = isPublished ? "text-green-600" : "text-orange-600";

  return (
    <main className="relative max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* ===== タイトル + 公開設定 ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1>アカウント管理</h1>
          <p className="text-text-muted">病院情報とアカウント設定を管理します。</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${pubDot}`} />
            <span className={`text-sm font-medium ${pubText}`}>{pubLabel}</span>
          </div>
          <button
            onClick={togglePublish}
            disabled={saving}
            className="bg-primary-500 text-white px-4 py-1 rounded-md hover:bg-primary-600 transition text-sm"
            title="学生への公開/非公開を切り替えます"
          >
            {isPublished ? "非公開にする" : "公開にする"}
          </button>
        </div>
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

      {/* ===== 通知設定（UIのみ） ===== */}
      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">通知設定</h2>
        <p className="text-text-muted text-sm">メール通知を受け取るイベントを選択してください</p>

        {[
          { label: "応募通知", desc: "学生から新しい応募があった時" },
          { label: "閲覧通知", desc: "学生があなたの病院情報を閲覧した時" },
          { label: "お気に入り通知", desc: "学生があなたの病院をお気に入りに追加した時" },
          { label: "面談返信通知", desc: "面談打診に対して学生から返信があった時" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between border rounded-md px-4 py-3 text-sm">
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