"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useFavoriteStudents, type FavStudent } from "../_providers/favorite-students";

/* ---------------------------
   マスタ定義（将来はDB/APIに移行可）
--------------------------- */
const GRAD_YEARS = [2025, 2026, 2027, 2028, 2029];

const DEPARTMENTS_GROUPED = [
  {
    group: "内科系",
    items: [
      "総合診療科", "消化器内科", "循環器内科", "呼吸器内科",
      "腎臓内科", "内分泌代謝内科", "神経内科", "血液内科", "膠原病・リウマチ科",
      "糖尿病内科", "肝臓内科", "感染症内科", "老年内科", "腫瘍内科", "緩和ケア内科"
    ],
  },
  {
    group: "外科系",
    items: [
      "消化器外科", "心臓血管外科", "呼吸器外科", "乳腺外科",
      "小児外科", "脳神経外科", "整形外科", "形成外科", "美容外科"
    ],
  },
  {
    group: "その他",
    items: [
      "麻酔科", "救急科", "小児科", "産婦人科", "耳鼻咽喉科", "眼科",
      "皮膚科", "泌尿器科", "精神科", "心療内科", "放射線科（画像診断）",
      "放射線治療科", "病理診断科", "臨床検査科", "リハビリテーション科",
      "麻酔・集中治療科", "ペインクリニック", "緩和ケア科", "その他"
    ],
  },
];

const REGIONS: { name: string; prefs: string[] }[] = [
  { name: "北海道・東北", prefs: ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"] },
  { name: "関東", prefs: ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"] },
  { name: "北陸・甲信越", prefs: ["新潟県","富山県","石川県","福井県","山梨県","長野県"] },
  { name: "東海", prefs: ["岐阜県","静岡県","愛知県","三重県"] },
  { name: "近畿", prefs: ["滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"] },
  { name: "中国", prefs: ["鳥取県","島根県","岡山県","広島県","山口県"] },
  { name: "四国", prefs: ["徳島県","香川県","愛媛県","高知県"] },
  { name: "九州・沖縄",  prefs: ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"] }
];

const SALARY_OPTIONS = ["指定なし", "400万円以上", "500万円以上", "600万円以上", "700万円以上", "800万円以上"];
const DUTY_OPTIONS = ["問わない", "可能", "相談", "不可"] as const;
const OBSERVE_OPTIONS = ["すぐ可能", "長期休みのみ", "未定"] as const;      // UIのみ（DB未接続）
const TRAVEL_SUPPORT_OPTIONS = ["問わない", "あり", "なし"] as const;       // UIのみ（DB未接続）

/* ---------------------------
   Supabase students 型（使用カラム／拡張版）
--------------------------- */
type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  university: string | null;
  grad_year: number | null;
  created_at: string | null;
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  gender: string | null;
  birthdate: string | null;
  faculty: string | null;
  phone: string | null;
  region: string | null;
  prefecture: string | null;
  duty_preference: string | null;     // "可能" | "相談" | "不可" | null
  desired_salary_min: number | null;
  major: string | null;               // CSV 等を想定（"救急科, 内科" など）
  avatar_url: string | null;
  transcript_url: string | null;
  certificate_url: string | null;
  updated_at: string | null;
};

/* ---------------------------
   ユーティリティ
--------------------------- */
function escapeIlike(s: string) {
  return s.replace(/[%_]/g, (m) => "\\" + m);
}
function useDebounced<T>(val: T, ms = 300) {
  const [v, setV] = useState(val);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setV(val), ms);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [val, ms]);
  return v;
}

/* ============================================================
   クライアント本体
============================================================ */
export default function StudentsClient() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // URL の ?tag= は表示だけ（今は DB 絞り込みに未反映）
  const [tag, setTag] =
    useState<"applied" | "viewed" | "favorited" | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tag");
    if (t === "applied" || t === "viewed" || t === "favorited") setTag(t);
  }, []);

  // お気に入り（病院側）
  const { isFavorite, toggleFavorite } = useFavoriteStudents();

  // フィルタ状態
  const [kw, setKw] = useState("");                         // 氏名/大学 検索
  const kwDebounced = useDebounced(kw, 300);
  const [selectedYears, setSelectedYears] = useState<number | "未選択">("未選択");
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [salary, setSalary] = useState<string>("指定なし");
  const [duty, setDuty] = useState<typeof DUTY_OPTIONS[number]>("問わない");

  // 表示のみのダミー保持（将来レジュメスキーマで接続）
  const [visitWish, setVisitWish] = useState<typeof OBSERVE_OPTIONS[number]>("すぐ可能");
  const [travelSupport, setTravelSupport] = useState<typeof TRAVEL_SUPPORT_OPTIONS[number]>("問わない");

  // 取得データ
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Supabase 検索
  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("students")
        .select(
          `
          id, name, email, university, grad_year,
          created_at, last_name, first_name, last_name_kana, first_name_kana,
          gender, birthdate, faculty, phone,
          region, prefecture, duty_preference, desired_salary_min, major,
          avatar_url, transcript_url, certificate_url, updated_at
          `
        )
        .order("updated_at", { ascending: false })
        .limit(200);

      // キーワード（氏名 or 大学）
      const t = kwDebounced.trim();
      if (t) {
        const like = `%${escapeIlike(t)}%`;
        q = q.or(`name.ilike.${like},university.ilike.${like},last_name.ilike.${like},first_name.ilike.${like}`);
      }

      // 都道府県（OR）
      if (selectedAreas.size > 0) {
        q = q.in("prefecture", Array.from(selectedAreas));
      }

      // 卒年（AND）
      if (selectedYears !== "未選択") {
        q = q.eq("grad_year", selectedYears);
      }

      // 当直可否（AND）
      if (duty !== "問わない") {
        q = q.eq("duty_preference", duty);
      }

      // 希望年収下限（AND）
      switch (salary) {
        case "400万円以上": q = q.gte("desired_salary_min", 400); break;
        case "500万円以上": q = q.gte("desired_salary_min", 500); break;
        case "600万円以上": q = q.gte("desired_salary_min", 600); break;
        case "700万円以上": q = q.gte("desired_salary_min", 700); break;
        case "800万円以上": q = q.gte("desired_salary_min", 800); break;
        default: break; // 指定なし
      }

      // 志望診療科（OR：major の部分一致）
      if (selectedDepartments.size > 0) {
        const parts = Array.from(selectedDepartments).map((dep) => `major.ilike.%25${escapeIlike(dep)}%25`);
        q = q.or(parts.join(","));
      }

      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as StudentRow[]);
    } catch (e: any) {
      console.error("[hospital/students] load error:", e.message);
      alert(`検索に失敗しました：${e.message ?? "unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kwDebounced, selectedAreas, selectedYears, duty, salary, selectedDepartments]);

  // Setユーティリティ
  const toggleSet = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };
  const toggleDepartment = (dep: string) => setSelectedDepartments((p) => toggleSet(p, dep));
  const toggleArea = (pref: string) => setSelectedAreas((p) => toggleSet(p, pref));

  const selectRegionAll = (regionName: string) => {
    const region = REGIONS.find((r) => r.name === regionName);
    if (!region) return;
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      region.prefs.forEach((p) => next.add(p));
      return next;
    });
  };
  const clearRegionAll = (regionName: string) => {
    const region = REGIONS.find((r) => r.name === regionName);
    if (!region) return;
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      region.prefs.forEach((p) => next.delete(p));
      return next;
    });
  };

  const clearAll = () => {
    setKw("");
    setSelectedYears("未選択");
    setSelectedDepartments(new Set());
    setSelectedAreas(new Set());
    setSalary("指定なし");
    setDuty("問わない");
    setVisitWish("すぐ可能");
    setTravelSupport("問わない");
    setTimeout(load, 0);
  };

  const scoutHref = (id: string) => `/hospital/scouts/new?studentId=${encodeURIComponent(id)}`;

  // 表示用ユーティリティ
  const salaryText = (min: number | null) => {
    if (min == null) return "—";
    if (min >= 800) return "800万円以上";
    if (min >= 700) return "700万円以上";
    if (min >= 600) return "600万円以上";
    if (min >= 500) return "500万円以上";
    if (min >= 400) return "400万円以上";
    return `${min}万円〜`;
  };

  return (
    <main className="max-w-6xl mx-auto px-8 py-6 space-y-8">
      <div>
        <h1>学生検索</h1>
        <p className="text-text-muted">
          {tag
            ? `表示中：${
                tag === "applied" ? "今月の応募"
                : tag === "viewed" ? "プロフィール閲覧"
                : "お気に入り"
              } の学生（下の条件で絞り込み）`
            : "条件を選ぶと右側に結果が即時反映されます。気になる学生は★で保存。"}
        </p>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* ===== サイドバー（検索条件） ===== */}
        <aside className="card h-fit p-5 sticky top-4 self-start">
          <h2 className="text-sm font-semibold text-primary-700 mb-4 flex items-center gap-2">🔍 検索条件</h2>

          {/* キーワード（氏名/大学） */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text mb-1">氏名 / 大学</label>
            <input
              value={kw}
              onChange={(e)=>setKw(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary-300"
              placeholder="例）山田 / 京都大学 …"
            />
          </div>

          {/* 卒業年度 */}
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">卒業年度</summary>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary-300"
              value={selectedYears === "未選択" ? "" : String(selectedYears)}
              onChange={(e) => setSelectedYears(e.target.value ? Number(e.target.value) : "未選択")}
            >
              <option value="">選択してください</option>
              {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}年卒</option>)}
            </select>
          </details>

          {/* 志望診療科（複数選択 / OR） */}
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">志望診療科（複数選択可）</summary>
            <div className="space-y-4 max-h-72 overflow-auto pr-2">
              {DEPARTMENTS_GROUPED.map((group) => {
                const selectAll = () => setSelectedDepartments(prev => {
                  const next = new Set(prev); group.items.forEach((d)=>next.add(d)); return next;
                });
                const clearAll = () => setSelectedDepartments(prev => {
                  const next = new Set(prev); group.items.forEach((d)=>next.delete(d)); return next;
                });

                return (
                  <div key={group.group} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{group.group}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={selectAll} className="text-xs px-2 py-1 border rounded-md text-primary-600 border-primary-400 hover:bg-primary-50">全選択</button>
                        <button type="button" onClick={clearAll} className="text-xs px-2 py-1 border rounded-md text-text-muted hover:bg-gray-50">解除</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      {group.items.map((dep) => (
                        <label key={dep} className="flex items-center gap-2">
                          <input type="checkbox" className="accent-primary-500"
                                 checked={selectedDepartments.has(dep)}
                                 onChange={() => toggleDepartment(dep)} />
                          <span>{dep}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>

          {/* 希望エリア（都道府県 / OR） */}
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">希望エリア（複数選択可）</summary>
            <div className="space-y-4 max-h-72 overflow-auto pr-2">
              {REGIONS.map((region) => (
                <div key={region.name} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{region.name}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => selectRegionAll(region.name)} className="text-xs px-2 py-1 border rounded-md text-primary-600 border-primary-400 hover:bg-primary-50">全選択</button>
                      <button type="button" onClick={() => clearRegionAll(region.name)} className="text-xs px-2 py-1 border rounded-md text-text-muted hover:bg-gray-50">解除</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {region.prefs.map((pref) => (
                      <label key={pref} className="flex items-center gap-2">
                        <input type="checkbox" className="accent-primary-500"
                               checked={selectedAreas.has(pref)}
                               onChange={() => toggleArea(pref)} />
                        <span>{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* 希望年収下限（desired_salary_min） */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">希望年収（下限）</summary>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary-300"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            >
              {SALARY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </details>

          {/* 当直可否（duty_preference） */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">当直可否</summary>
            <div className="space-y-2 text-sm">
              {DUTY_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input type="radio" name="duty" value={opt}
                         checked={duty === opt} onChange={() => setDuty(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </details>

          {/* 見学希望 / 交通費補助（UIのみ） */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">見学希望（UIのみ）</summary>
            <div className="space-y-2 text-sm">
              {OBSERVE_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input type="radio" name="visit" value={opt}
                         checked={visitWish === opt} onChange={() => setVisitWish(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </details>

          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">交通費補助希望（UIのみ）</summary>
            <div className="space-y-2 text-sm">
              {TRAVEL_SUPPORT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input type="radio" name="travel" value={opt}
                         checked={travelSupport === opt} onChange={() => setTravelSupport(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </details>

          <div className="flex flex-col gap-2 pt-2">
            <button type="button" onClick={load} className="btn-primary text-sm">検索</button>
            <button type="button" onClick={clearAll}
                    className="border border-primary-500 text-primary-600 rounded-md py-2 text-sm hover:bg-primary-50 transition">
              条件をクリア
            </button>
          </div>
        </aside>

        {/* ====== 検索結果 ====== */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">{loading ? "検索中…" : `${rows.length}件の学生が見つかりました`}</p>
            <select className="border rounded-md px-3 py-1 text-sm focus:ring focus:ring-primary-300" onChange={()=>{}}>
              <option>新着順</option>
            </select>
          </div>

          {rows.map((s) => (
            <div key={s.id} className="card p-5 hover:shadow-md transition space-y-3">
              {/* ヘッダ */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-primary-700">{s.name ?? "（氏名未設定）"}</h3>
                  <p className="text-sm text-text-muted">
                    {s.university ?? "大学未設定"}・{s.grad_year ? `${s.grad_year}年卒` : "卒年未設定"}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {/* 見学は UI 表示のみ */}
                  <span className="px-2 py-1 border rounded-full bg-primary-50 text-primary-700">
                    見学：{visitWish}
                  </span>
                  <span className="px-2 py-1 border rounded-full bg-gray-50 text-text-muted">
                    当直：{s.duty_preference ?? "—"}
                  </span>
                </div>
              </div>

              {/* 自己PR（現状は major に代用 / 将来レジュメ連携で差し替え） */}
              <p className="text-sm text-text">{s.major ? `志望診療科：${s.major}` : "（志望診療科の登録はまだありません）"}</p>

              {/* 詳細情報 */}
              <div className="grid md:grid-cols-2 gap-2 text-sm text-text-muted">
                <p><span className="font-medium">希望エリア：</span>{s.prefecture ?? "—"}</p>
                <p><span className="font-medium">志望診療科：</span>{s.major ?? "—"}</p>
                <p><span className="font-medium">希望年収：</span>{salaryText(s.desired_salary_min)}</p>
                <p><span className="font-medium">メール：</span>{s.email ?? "—"}</p>
              </div>

              {/* アクション */}
              <div className="flex gap-3 pt-1">
                <Link
                  href={`/hospital/students/${s.id}`}
                  className="bg-primary-500 text-white rounded-md px-4 py-1 text-sm hover:bg-primary-600 active:bg-primary-700 transition inline-block text-center"
                >
                  プロフィールを開く
                </Link>

                {/* スカウト（送付画面へ遷移） */}
                <Link
                  href={`/hospital/scouts/new?studentId=${encodeURIComponent(s.id)}`}
                  className="border border-primary-500 text-primary-600 rounded-md px-4 py-1 text-sm hover:bg-primary-50 transition inline-block"
                >
                  スカウト
                </Link>

                {/* お気に入り（病院側） */}
                <button
                  onClick={() =>
                    toggleFavorite({
                      id: s.id,
                      name: s.name ?? "（氏名未設定）",
                      university: s.university ?? "",
                      gradYear: s.grad_year != null ? String(s.grad_year) : undefined,
                    } as FavStudent)
                  }
                  className={`border rounded-md px-4 py-1 text-sm hover:bg-gray-50 transition ${isFavorite(s.id) ? "border-primary-500 text-primary-600" : ""}`}
                  title={isFavorite(s.id) ? "お気に入り解除" : "お気に入りに追加"}
                >
                  {isFavorite(s.id) ? "お気に入り解除" : "お気に入り"}
                </button>
              </div>
            </div>
          ))}

          {!loading && rows.length === 0 && (
            <div className="card text-center py-10 text-text-muted">
              条件に合致する学生が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}