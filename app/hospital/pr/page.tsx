"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
  DragEvent,
} from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { Upload, Eye, Trash2, Pencil, Save } from "lucide-react";

/* --------------------------------------------------
   Supabase 型（hospital_accounts の主要カラム）
   ※ hospitals と同じ命名に合わせています
-------------------------------------------------- */
type Facility = "二次救急" | "三次救急" | "どちらでも" | "不明";
type Duty = "~2回" | "3~4回" | "5回以上" | "特になし";

type HospitalAccount = {
  id: string;                    // auth.uid() と一致
  hospital_id: string | null;    // 公開側（hospitals.id）への紐付け
  hospital_name: string | null;
  prefecture: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  access: string | null;
  website_url: string | null;

  facility_type: Facility | null;
  bed_count: number | null;
  residents_first_year: number | null;
  residents_total: number | null;
  duty_frequency: Duty | null;

  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;

  bonus: "あり" | "なし" | null;
  housing_allowance: boolean | null;
  overtime_allowance: boolean | null;
  commute_allowance: boolean | null;

  pr_highlights: string | null;

  contact_email: string | null;
  contact_tel: string | null;

  /* 画像（必要なら先にカラム追加）
  hero_image_url?: string | null;
  logo_url?: string | null;
  */

  is_published: boolean | null;
};

const inputBase =
  "w-full border rounded-md px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none";
const inputReadonly = inputBase + " bg-gray-50 text-gray-600 cursor-default";
const inputEditable = inputBase + " focus:ring focus:ring-primary-300 focus:border-primary-400";
const L = ({ children }: { children: string }) => (
  <label className="block text-sm mb-1 text-text-muted">{children}</label>
);

export default function HospitalPRPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [uid, setUid] = useState<string>("");          // auth.uid()

  /** ============ DB 読み / 保存 ============ */
  const [row, setRow] = useState<HospitalAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインが必要です。");
        return;
      }
      setUid(user.id);

      // 自分のレコードを取得（なければ作成）
      const { data, error } = await supabase
        .from("hospital_accounts")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const { error: upErr } = await supabase
          .from("hospital_accounts")
          .upsert({ id: user.id, hospital_id: user.id, is_published: true });
        if (upErr) throw upErr;
      } else if (!data.hospital_id) {
        // 紐付け漏れの保険：未設定なら id を紐付ける
        const { error: linkErr } = await supabase
          .from("hospital_accounts")
          .update({ hospital_id: user.id })
          .eq("id", user.id);
        if (linkErr) console.warn("[pr] link hospital_id fallback:", linkErr.message);
      }

      // 最新を読み直し
      const { data: latest, error: reErr } = await supabase
        .from("hospital_accounts")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (reErr) throw reErr;

      setRow(latest as HospitalAccount);
    } catch (e: any) {
      console.error("[pr] load error:", e?.message);
      alert(`読み込みに失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const save = useCallback(
    async (payload: Partial<HospitalAccount>) => {
      if (!uid) return;
      setSaving(true);
      try {
        const { error } = await supabase
          .from("hospital_accounts")
          .update(payload)
          .eq("id", uid);
        if (error) throw error;
        await load(); // 反映
      } catch (e: any) {
        console.error("[pr] save error:", e?.message);
        alert(`保存に失敗しました：${e?.message ?? "unknown"}`);
      } finally {
        setSaving(false);
      }
    },
    [supabase, uid, load]
  );

  /** ============ 画面制御 ============ */
  const [isPublic, setIsPublic] = useState(true); // DBの is_published と同期

  // Hero / Logo は今回はプレビューのみ（Storage導入は後続）
  const heroInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [heroURL, setHeroURL] = useState<string | null>(null);
  const [logoURL, setLogoURL] = useState<string | null>(null);
  const onPickHero = () => heroInputRef.current?.click();
  const onPickLogo = () => logoInputRef.current?.click();
  const handleHeroSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) setHeroURL(URL.createObjectURL(f));
  };
  const handleLogoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) setLogoURL(URL.createObjectURL(f));
  };
  const handleHeroDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setHeroURL(URL.createObjectURL(f)); };
  const handleLogoDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setLogoURL(URL.createObjectURL(f)); };

  // 病院概要
  const [editOverview, setEditOverview] = useState(false);
  const [overview, setOverview] = useState({
    hospital_name: "",
    prefecture: "",
    address: "",
    region: "",
    city: "",
    facility_type: "",
    bed_count: "",
    residents_first_year: "",
    residents_total: "",
    duty_frequency: "",
    website_url: "",
    access: "",
  });

  // PR
  const [editPR, setEditPR] = useState(false);
  const [pr, setPr] = useState({ text: "" });

  // 求人
  const [editJob, setEditJob] = useState(false);
  const [job, setJob] = useState({
    salaryMin: "",
    salaryMax: "",
    bonus: "あり",
    housing: "false",
    overtime: "false",
    commute: "false",
  });

  // 初期ロード
  useEffect(() => { load(); }, [load]);

  // DB行を state に反映
  useEffect(() => {
    if (!row) return;
    setOverview({
      hospital_name: row.hospital_name ?? "",
      prefecture   : row.prefecture ?? "",
      address      : row.address ?? "",
      region       : row.region ?? "",
      city         : row.city ?? "",
      facility_type: (row.facility_type ?? "") as string,
      bed_count    : row.bed_count?.toString() ?? "",
      residents_first_year: row.residents_first_year?.toString() ?? "",
      residents_total     : row.residents_total?.toString() ?? "",
      duty_frequency: (row.duty_frequency ?? "") as string,
      website_url  : row.website_url ?? "",
      access       : row.access ?? "",
    });
    setPr({ text: row.pr_highlights ?? "" });
    setJob({
      salaryMin: row.salary_1st_year_min?.toString() ?? "",
      salaryMax: row.salary_1st_year_max?.toString() ?? "",
      bonus    : row.bonus ?? "あり",
      housing  : String(!!row.housing_allowance),
      overtime : String(!!row.overtime_allowance),
      commute  : String(!!row.commute_allowance),
    });
    setIsPublic(row.is_published ?? true);
  }, [row]);

  /* ================== 画面 ================== */
  const pubLabel = useMemo(() => (isPublic ? "公開中" : "非公開"), [isPublic]);
  const pubColor = isPublic ? "text-green-600" : "text-orange-600";
  const dotColor = isPublic ? "bg-green-500" : "bg-orange-400";

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-8 py-6">
        <p className="text-gray-600">読込中…</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* ===== ヘッダ ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1>PRページ編集</h1>
          <p className="text-text-muted">
            各カードの「編集」から入力できます。保存すると Supabase の hospital_accounts に反映されます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            <span className={`text-sm font-medium ${pubColor}`}>{pubLabel}</span>
          </div>
          <button className="border border-primary-500 text-primary-600 rounded-md px-4 py-1 text-sm hover:bg-primary-50 transition">
            プレビュー
          </button>
          <button
            onClick={async () => {
              const next = !isPublic;
              setIsPublic(next);
              await save({ is_published: next });
            }}
            className="bg-primary-500 text-white px-4 py-1 rounded-md hover:bg-primary-600 transition text-sm"
          >
            {isPublic ? "非公開にする" : "公開にする"}
          </button>
        </div>
      </div>

      {/* ===== Hero画像・ロゴ（プレビューのみ） ===== */}
      <section className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">Hero画像・ロゴ</h2>
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
              <img src={heroURL} alt="Hero preview" className="w-full h-48 object-cover rounded-lg" />
            ) : (
              <>
                <Upload className="w-6 h-6 mb-2 text-primary-500" />
                <p className="text-sm">クリックまたはドラッグ&ドロップでアップロード</p>
                <p className="text-xs">1920x1080px / JPG, PNG形式</p>
              </>
            )}
          </div>
          <input ref={heroInputRef} type="file" accept="image/*" onChange={handleHeroSelect} hidden />
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
              <img src={logoURL} alt="Logo preview" className="w-32 h-32 object-contain" />
            ) : (
              <>
                <Upload className="w-5 h-5 mb-2 text-primary-500" />
                <p className="text-sm">ロゴをアップロード</p>
              </>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} hidden />
        </div>
      </section>

      {/* ===== 病院概要 ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
          {editOverview ? (
            <button
              disabled={saving}
              onClick={async () => {
                setEditOverview(false);
                await save({
                  hospital_name: overview.hospital_name || null,
                  prefecture   : overview.prefecture || null,
                  address      : overview.address || null,
                  region       : overview.region || null,
                  city         : overview.city || null,
                  facility_type: (overview.facility_type as Facility) || null,
                  bed_count    : overview.bed_count ? Number(overview.bed_count) : null,
                  residents_first_year: overview.residents_first_year ? Number(overview.residents_first_year) : null,
                  residents_total     : overview.residents_total ? Number(overview.residents_total) : null,
                  duty_frequency: (overview.duty_frequency as Duty) || null,
                  website_url  : overview.website_url || null,
                  access       : overview.access || null,
                });
              }}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> {saving ? "保存中…" : "保存"}
            </button>
          ) : (
            <button onClick={() => setEditOverview(true)} className="flex items-center text-primary-600 text-sm hover:underline">
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { key: "hospital_name", label: "病院名", ph: "例：東京中央医療センター" },
            { key: "prefecture", label: "都道府県", ph: "例：東京都" },
            { key: "address", label: "所在地", ph: "例：東京都新宿区〇〇…" },
            { key: "region", label: "エリア（地方）", ph: "例：関東" },
            { key: "city", label: "市区町村", ph: "例：新宿区" },
            { key: "facility_type", label: "救急区分（例：二次救急）", ph: "二次救急/三次救急/不明/どちらでも" },
            { key: "bed_count", label: "病床数", ph: "例：500" },
            { key: "residents_first_year", label: "初期研修医（1年目）", ph: "例：10" },
            { key: "residents_total", label: "研修医（合計）", ph: "例：20" },
            { key: "duty_frequency", label: "当直回数（例：3~4回）", ph: "~2回/3~4回/5回以上/特になし" },
            { key: "website_url", label: "公式サイトURL", ph: "https://..." },
            { key: "access", label: "アクセス", ph: "例：○○駅 徒歩5分" },
          ].map((f) => (
            <div key={f.key}>
              <L>{f.label}</L>
              <input
                type="text"
                placeholder={f.ph}
                value={(overview as any)[f.key] as string}
                onChange={(e) => setOverview((prev) => ({ ...prev, [f.key]: e.target.value }))}
                disabled={!editOverview}
                className={editOverview ? inputEditable : inputReadonly}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== PRポイント ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">PRポイント</h2>
          {editPR ? (
            <button
              disabled={saving}
              onClick={async () => {
                setEditPR(false);
                await save({ pr_highlights: pr.text || null });
              }}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> {saving ? "保存中…" : "保存"}
            </button>
          ) : (
            <button onClick={() => setEditPR(true)} className="flex items-center text-primary-600 text-sm hover:underline">
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <L>PR内容</L>
            <textarea
              placeholder="例：幅広い症例を経験できます…"
              rows={4}
              value={pr.text}
              onChange={(e) => setPr({ text: e.target.value })}
              disabled={!editPR}
              className={(editPR ? inputEditable : inputReadonly) + " resize-y"}
            />
          </div>
        </div>
      </section>

      {/* ===== 求人詳細 ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">求人詳細</h2>
          {editJob ? (
            <button
              disabled={saving}
              onClick={async () => {
                setEditJob(false);
                await save({
                  salary_1st_year_min: job.salaryMin ? Number(job.salaryMin) : null,
                  salary_1st_year_max: job.salaryMax ? Number(job.salaryMax) : null,
                  bonus: (job.bonus as "あり" | "なし") ?? null,
                  housing_allowance: job.housing === "true",
                  overtime_allowance: job.overtime === "true",
                  commute_allowance: job.commute === "true",
                });
              }}
              className="bg-primary-500 text-white text-sm px-3 py-1 rounded-md flex items-center gap-1 hover:bg-primary-600 transition"
            >
              <Save className="w-4 h-4" /> {saving ? "保存中…" : "保存"}
            </button>
          ) : (
            <button onClick={() => setEditJob(true)} className="flex items-center text-primary-600 text-sm hover:underline">
              <Pencil className="w-4 h-4 mr-1" /> 編集
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { key: "salaryMin", label: "給与（1年次：下限）", ph: "例：348" },
            { key: "salaryMax", label: "給与（1年次：上限）", ph: "例：482" },
          ].map((f) => (
            <div key={f.key}>
              <L>{f.label}</L>
              <input
                type="number"
                placeholder={f.ph}
                value={(job as any)[f.key] as string}
                onChange={(e) => setJob((prev) => ({ ...prev, [f.key]: e.target.value }))}
                disabled={!editJob}
                className={editJob ? inputEditable : inputReadonly}
              />
            </div>
          ))}

          <div>
            <L>賞与</L>
            <select
              value={job.bonus}
              onChange={(e) => setJob((prev) => ({ ...prev, bonus: e.target.value }))}
              disabled={!editJob}
              className={editJob ? inputEditable : inputReadonly}
            >
              <option value="あり">あり</option>
              <option value="なし">なし</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <L>住宅手当</L>
              <select
                value={job.housing}
                onChange={(e) => setJob((prev) => ({ ...prev, housing: e.target.value }))}
                disabled={!editJob}
                className={editJob ? inputEditable : inputReadonly}
              >
                <option value="false">なし</option>
                <option value="true">あり</option>
              </select>
            </div>
            <div>
              <L>時間外手当</L>
              <select
                value={job.overtime}
                onChange={(e) => setJob((prev) => ({ ...prev, overtime: e.target.value }))}
                disabled={!editJob}
                className={editJob ? inputEditable : inputReadonly}
              >
                <option value="false">なし</option>
                <option value="true">あり</option>
              </select>
            </div>
            <div>
              <L>通勤手当</L>
              <select
                value={job.commute}
                onChange={(e) => setJob((prev) => ({ ...prev, commute: e.target.value }))}
                disabled={!editJob}
                className={editJob ? inputEditable : inputReadonly}
              >
                <option value="false">なし</option>
                <option value="true">あり</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 資料アップロード（プレビューのみ） ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">資料アップロード</h2>
        </div>
        <p className="text-text-muted text-sm">
          PDFや画像などを追加できます（いまはローカルプレビューのみ／保存対象外）。
        </p>

        <DocsManager />
      </section>
    </main>
  );
}

/* ==== ここから小さな部品 ==== */

function DocsManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<
    { id: string; name: string; type: string; updated: string; public: boolean }[]
  >([]);
  const onPick = () => inputRef.current?.click();
  const add = (files: FileList | null) => {
    if (!files || !files.length) return;
    const now = new Date();
    const updated = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")}`;
    const arr = Array.from(files).map((f, i) => ({ id: `${now.getTime()}-${i}`, name: f.name, type: "未設定", updated, public: true }));
    setItems(prev => [...prev, ...arr]);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); add(e.dataTransfer.files); };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => add(e.target.files);
  const remove = (id: string) => setItems(prev => prev.filter(x => x.id !== id));

  return (
    <>
      <div
        className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-center text-text-muted hover:bg-primary-50 transition cursor-pointer relative"
        onClick={onPick}
        onDragOver={(e)=>e.preventDefault()}
        onDrop={onDrop}
        role="button"
        aria-label="資料をアップロード"
      >
        <Upload className="w-6 h-6 mb-2 text-primary-500" />
        <p className="text-sm">クリックまたはドラッグ&ドロップでアップロード</p>
        <input ref={inputRef} type="file" multiple onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer" />
      </div>

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
            {items.map((d) => (
              <tr key={d.id} className="border-b last:border-none hover:bg-primary-50">
                <td className="py-2 px-4">{d.name}</td>
                <td className="py-2 px-4">{d.type}</td>
                <td className="py-2 px-4">{d.updated}</td>
                <td className="py-2 px-4">
                  <input
                    type="checkbox"
                    checked={d.public}
                    onChange={() => setItems(prev => prev.map(x => x.id === d.id ? { ...x, public: !x.public } : x))}
                    className="h-4 w-4 accent-primary-500"
                  />
                </td>
                <td className="py-2 px-4 flex items-center gap-2 text-primary-600">
                  <button title="プレビュー"><Eye className="w-4 h-4" /></button>
                  <button title="削除" className="text-red-500 hover:text-red-700" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}