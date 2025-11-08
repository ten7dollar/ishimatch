"use client";

import {
  ChangeEvent,
  DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { Upload, Eye, Trash2, Pencil, Save } from "lucide-react";

/** 共通入力クラス（編集時に青フォーカス・placeholderは薄灰） */
const inputBase =
  "w-full border rounded-md px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none";
const inputReadonly =
  inputBase + " bg-gray-50 text-gray-600 cursor-default";
const inputEditable =
  inputBase + " focus:ring focus:ring-primary-300 focus:border-primary-400";

/** ラベル */
const L = ({ children }: { children: string }) => (
  <label className="block text-sm mb-1 text-text-muted">{children}</label>
);

export default function HospitalPRPage() {
  const [isPublic, setIsPublic] = useState(true);

  /** ------------- Hero / Logo ------------- */
  const heroInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [heroURL, setHeroURL] = useState<string | null>(null);
  const [logoURL, setLogoURL] = useState<string | null>(null);

  const onPickHero = () => heroInputRef.current?.click();
  const onPickLogo = () => logoInputRef.current?.click();

  const handleHeroSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setHeroURL(URL.createObjectURL(f));
  };
  const handleLogoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoURL(URL.createObjectURL(f));
  };

  const handleHeroDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setHeroURL(URL.createObjectURL(f));
  };
  const handleLogoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setLogoURL(URL.createObjectURL(f));
  };

  /** ------------- 病院概要 ------------- */
  const [editOverview, setEditOverview] = useState(false);
  const [overview, setOverview] = useState({
    name: "",
    address: "",
    prefecture: "",
    mentors: "",
    emergency: "",
    interns: "",
  });

  /** ------------- PRポイント ------------- */
  const [editPR, setEditPR] = useState(false);
  const [pr, setPr] = useState({
    text: "",
    galleryUrl: "",
  });

  /** ------------- 求人詳細 ------------- */
  const [editJob, setEditJob] = useState(false);
  const [job, setJob] = useState({
    mentors: "",
    salaryY1: "",
    salaryY2: "",
    duty: "",
    schedule: "",
  });

  /** ------------- 資料アップロード ------------- */
  const docsInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<
    { id: string; name: string; type: string; updated: string; public: boolean }[]
  >([
    {
      id: "d1",
      name: "募集要項.pdf",
      type: "募集要項",
      updated: "2025/10/15",
      public: true,
    },
    {
      id: "d2",
      name: "カリキュラム.pdf",
      type: "カリキュラム",
      updated: "2025/10/10",
      public: true,
    },
  ]);

  const onPickDocs = () => docsInputRef.current?.click();

  const addDocs = (files: FileList | null) => {
    if (!files || !files.length) return;
    const now = new Date();
    const updated = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(now.getDate()).padStart(2, "0")}`;
    const newItems = Array.from(files).map((f, idx) => ({
      id: `local-${now.getTime()}-${idx}`,
      name: f.name,
      type: "未設定",
      updated,
      public: true,
    }));
    setDocs((prev) => [...prev, ...newItems]);
  };

  const onDocsSelect = (e: ChangeEvent<HTMLInputElement>) => {
    addDocs(e.target.files);
  };

  const onDocsDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    addDocs(e.dataTransfer.files);
  };

  const removeDoc = (id: string) =>
    setDocs((prev) => prev.filter((d) => d.id !== id));

  /** ------------- 表示用 ------------- */
  const pubLabel = useMemo(
    () => (isPublic ? "公開中" : "非公開"),
    [isPublic]
  );
  const pubColor = isPublic ? "text-green-600" : "text-orange-600";
  const dotColor = isPublic ? "bg-green-500" : "bg-orange-400";

  return (
    <main className="max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* ===== ヘッダ ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1>PRページ編集</h1>
          <p className="text-text-muted">
            各カードの「編集」から入力できます。画像・資料はローカルでプレビュー表示されます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            <span className={`text-sm font-medium ${pubColor}`}>{pubLabel}</span>
          </div>
          <button
            className="border border-primary-500 text-primary-600 rounded-md px-4 py-1 text-sm hover:bg-primary-50 transition"
          >
            プレビュー
          </button>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className="bg-primary-500 text-white px-4 py-1 rounded-md hover:bg-primary-600 transition text-sm"
          >
            {isPublic ? "非公開にする" : "公開にする"}
          </button>
        </div>
      </div>

      {/* ===== Hero画像・ロゴ ===== */}
      <section className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">
            Hero画像・ロゴ
          </h2>
          {/* 「編集」ではなく常時アップ可能（クリック可能領域の修正点） */}
        </div>

        {/* Hero */}
        <div>
          <L>Hero画像（16:9）</L>
          <div
            className="border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center text-center text-text-muted hover:bg-primary-50 transition cursor-pointer"
            onClick={onPickHero}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleHeroDrop}
            role="button"
            aria-label="Hero画像をアップロード"
          >
            {heroURL ? (
              <img
                src={heroURL}
                alt="Hero preview"
                className="w-full h-48 object-cover rounded-lg"
              />
            ) : (
              <>
                <Upload className="w-6 h-6 mb-2 text-primary-500" />
                <p className="text-sm">クリックまたはドラッグ&ドロップでアップロード</p>
                <p className="text-xs">1920x1080px / JPG, PNG形式</p>
              </>
            )}
          </div>
          <input
            ref={heroInputRef}
            type="file"
            accept="image/*"
            onChange={handleHeroSelect}
            className="mt-2 text-sm"
            hidden
          />
        </div>

        {/* ロゴ */}
        <div>
          <L>病院ロゴ（正方形）</L>
          <div
            className="border rounded-md w-32 h-32 flex flex-col items-center justify-center text-center text-text-muted hover:bg-primary-50 transition cursor-pointer"
            onClick={onPickLogo}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleLogoDrop}
            role="button"
            aria-label="病院ロゴをアップロード"
          >
            {logoURL ? (
              <img
                src={logoURL}
                alt="Logo preview"
                className="w-32 h-32 object-contain"
              />
            ) : (
              <>
                <Upload className="w-5 h-5 mb-2 text-primary-500" />
                <p className="text-sm">ロゴをアップロード</p>
              </>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoSelect}
            className="mt-2 text-sm"
            hidden
          />
        </div>
      </section>

      {/* ===== 病院概要（編集→保存が動く） ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
          {editOverview ? (
            <button
              onClick={() => setEditOverview(false)}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
          ) : (
            <button
              onClick={() => setEditOverview(true)}
              className="flex items-center text-primary-600 text-sm hover:underline"
            >
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <p className="text-text-muted text-sm">基本情報を入力してください</p>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { key: "name", label: "病院名", ph: "例：東京中央医療センター" },
            { key: "prefecture", label: "都道府県", ph: "例：東京都" },
            { key: "address", label: "所在地", ph: "例：東京都新宿区成城1-2-3" },
            { key: "mentors", label: "指導医数", ph: "例：36名" },
            { key: "emergency", label: "救急区分", ph: "例：三次救急" },
            { key: "interns", label: "初期研修医", ph: "例：1年次6名／2年次4名" },
          ].map((f) => (
            <div key={f.key}>
              <L>{f.label}</L>
              <input
                type="text"
                placeholder={f.ph}
                value={(overview as any)[f.key] as string}
                onChange={(e) =>
                  setOverview((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                disabled={!editOverview}
                className={editOverview ? inputEditable : inputReadonly}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== PRポイント（編集→保存） ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">PRポイント</h2>
          {editPR ? (
            <button
              onClick={() => setEditPR(false)}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
          ) : (
            <button
              onClick={() => setEditPR(true)}
              className="flex items-center text-primary-600 text-sm hover:underline"
            >
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <p className="text-text-muted text-sm">
          病院の魅力を伝えるポイントと写真ギャラリー
        </p>

        <div className="space-y-3 text-sm">
          <div>
            <L>PR内容</L>
            <textarea
              placeholder="例：幅広い症例を経験できます。年間救急搬送数は8000件超…"
              rows={4}
              value={pr.text}
              onChange={(e) => setPr((prev) => ({ ...prev, text: e.target.value }))}
              disabled={!editPR}
              className={(editPR ? inputEditable : inputReadonly) + " resize-y"}
            />
          </div>
          <div>
            <L>写真ギャラリーURL</L>
            <input
              type="text"
              placeholder="例：https://example.com/gallery"
              value={pr.galleryUrl}
              onChange={(e) =>
                setPr((prev) => ({ ...prev, galleryUrl: e.target.value }))
              }
              disabled={!editPR}
              className={editPR ? inputEditable : inputReadonly}
            />
          </div>
        </div>
      </section>

      {/* ===== 求人詳細（編集→保存） ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">求人詳細</h2>
          {editJob ? (
            <button
              onClick={() => setEditJob(false)}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
          ) : (
            <button
              onClick={() => setEditJob(true)}
              className="flex items-center text-primary-600 text-sm hover:underline"
            >
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <p className="text-text-muted text-sm">給与・採用情報を入力してください</p>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { key: "mentors", label: "指導医数", ph: "例：36名" },
            { key: "salaryY1", label: "給与（1年次）", ph: "例：月給500,000円／年収6,000,000円" },
            { key: "salaryY2", label: "給与（2年次）", ph: "例：月給550,000円／年収6,600,000円" },
            { key: "duty", label: "当直回数", ph: "例：月4回程度" },
            { key: "schedule", label: "試験日程", ph: "例：8/16（火）、8/30（火） 他随時" },
          ].map((f) => (
            <div key={f.key}>
              <L>{f.label}</L>
              <input
                type="text"
                placeholder={f.ph}
                value={(job as any)[f.key] as string}
                onChange={(e) => setJob((prev) => ({ ...prev, [f.key]: e.target.value }))}
                disabled={!editJob}
                className={editJob ? inputEditable : inputReadonly}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== 資料アップロード（クリック/ドロップで追加 → リスト表示） ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">資料アップロード</h2>
        </div>
        <p className="text-text-muted text-sm">
          PDFや画像などを追加できます（いまはローカルプレビューのみ）。
        </p>

        <div
          className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-center text-text-muted hover:bg-primary-50 transition cursor-pointer relative"
          onClick={onPickDocs}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDocsDrop}
          role="button"
          aria-label="資料をアップロード"
        >
          <Upload className="w-6 h-6 mb-2 text-primary-500" />
          <p className="text-sm">クリックまたはドラッグ&ドロップでアップロード</p>
          <input
            ref={docsInputRef}
            type="file"
            multiple
            onChange={onDocsSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        {/* ファイル一覧 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b text-text-muted">
              <tr>
                <th className="py-2 px-4">ファイル名</th>
                <th className="py-2 px-4">種別</th>
                <th className="py-2 px-4">更新日</th>
                <th className="py-2 px-4">公開</th>
                <th className="py-2 px-4">アクション</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b last:border-none hover:bg-primary-50">
                  <td className="py-2 px-4">{d.name}</td>
                  <td className="py-2 px-4">{d.type}</td>
                  <td className="py-2 px-4">{d.updated}</td>
                  <td className="py-2 px-4">
                    <input
                      type="checkbox"
                      checked={d.public}
                      onChange={() =>
                        setDocs((prev) =>
                          prev.map((x) =>
                            x.id === d.id ? { ...x, public: !x.public } : x
                          )
                        )
                      }
                      className="h-4 w-4 accent-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4 flex items-center gap-2 text-primary-600">
                    <button title="プレビュー">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title="削除"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeDoc(d.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}