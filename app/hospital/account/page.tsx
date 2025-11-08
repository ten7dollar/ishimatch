"use client";

import { useState } from "react";
import { Lock, Save, Pencil, CheckCircle } from "lucide-react";

export default function HospitalAccountPage() {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /** 保存後トースト表示 */
  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <main className="relative max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* ===== タイトル ===== */}
      <div>
        <h1>アカウント管理</h1>
        <p className="text-text-muted">
          病院情報とアカウント設定を管理します。
        </p>
      </div>

      {/* ===== 代表者情報 ===== */}
      <section className="card p-6 space-y-4 relative">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">代表者情報</h2>
          {editingSection === "rep" ? (
            <button
              onClick={() => {
                setEditingSection(null);
                handleSave();
              }}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> 保存
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

        <p className="text-text-muted text-sm">
          病院の代表者・担当者情報を入力してください
        </p>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { label: "氏名", placeholder: "例：山田太郎" },
            { label: "役職", placeholder: "例：採用担当課長" },
            { label: "電話番号", placeholder: "例：03-1234-5678" },
            { label: "メールアドレス", placeholder: "例：yamada@hospital.jp" },
          ].map((f, i) => (
            <div key={i}>
              <label className="block text-text-muted mb-1">{f.label}</label>
              <input
                type="text"
                placeholder={f.placeholder}
                disabled={editingSection !== "rep"}
                className={`w-full border rounded-md px-3 py-2 text-sm placeholder:text-gray-400 ${
                  editingSection === "rep"
                    ? "focus:ring focus:ring-primary-300 focus:border-primary-400"
                    : "bg-gray-50 text-gray-500"
                }`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== 採用連絡先 ===== */}
      <section className="card p-6 space-y-4 relative">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">採用連絡先</h2>
          {editingSection === "contact" ? (
            <button
              onClick={() => {
                setEditingSection(null);
                handleSave();
              }}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> 保存
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

        <p className="text-text-muted text-sm">
          学生への通知送信先となる連絡先を設定してください
        </p>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { label: "部署名", placeholder: "例：人事部" },
            { label: "採用窓口メール", placeholder: "例：recruit@hospital.jp" },
          ].map((f, i) => (
            <div key={i}>
              <label className="block text-text-muted mb-1">{f.label}</label>
              <input
                type="text"
                placeholder={f.placeholder}
                disabled={editingSection !== "contact"}
                className={`w-full border rounded-md px-3 py-2 text-sm placeholder:text-gray-400 ${
                  editingSection === "contact"
                    ? "focus:ring focus:ring-primary-300 focus:border-primary-400"
                    : "bg-gray-50 text-gray-500"
                }`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== 通知設定 ===== */}
      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">通知設定</h2>
        <p className="text-text-muted text-sm">
          メール通知を受け取るイベントを選択してください
        </p>

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
            <input
              type="checkbox"
              className="accent-primary-500 h-5 w-5"
              defaultChecked
            />
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
              <label className="block text-text-muted mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                placeholder="現在のパスワードを入力"
                className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1">
                新しいパスワード
              </label>
              <input
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
                onClick={() => {
                  handleSave();
                  setShowPasswordFields(false);
                }}
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
              <p className="text-text-muted text-xs">
                最終更新日：2025年9月15日
              </p>
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