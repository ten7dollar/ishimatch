"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// 病院側 Provider（相対パス）
import { useScoutsOutbox } from "../_providers/scout-outbox";
import { useFavoriteStudents } from "../_providers/favorite-students";

/* ---------------------------
   マスタ定義（将来はDBやAPIに移行可）
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
const OBSERVE_OPTIONS = ["すぐ可能", "長期休みのみ", "未定"] as const;
const TRAVEL_SUPPORT_OPTIONS = ["問わない", "あり", "なし"] as const;

/* ---------------------------
   型
--------------------------- */
type Student = {
  id: string;
  name: string;
  university: string;
  grad_year: number;
  interests: string;
  preferredAreas: string[];
  preferredDepartments: string[];
  desiredSalary?: string;
  duty: typeof DUTY_OPTIONS[number];
  visitWish: typeof OBSERVE_OPTIONS[number];
  travelSupport: typeof TRAVEL_SUPPORT_OPTIONS[number];
  tag?: "applied" | "viewed" | "favorited";
};

/* ---------------------------
   ダミーデータ（将来 Supabase に置換）
--------------------------- */
const DUMMY_STUDENTS: Student[] = [
  {
    id: "s1",
    name: "山田太郎",
    university: "東京大学医学部",
    grad_year: 2026,
    interests: "救急医療に強い関心があり、初期研修で幅広い症例を経験したいと考えています。ACLS 取得済み。",
    preferredAreas: ["東京都", "神奈川県"],
    preferredDepartments: ["救急科", "内科", "循環器内科"],
    desiredSalary: "500万円以上",
    duty: "可能",
    visitWish: "すぐ可能",
    travelSupport: "あり",
    tag: "applied",
  },
  {
    id: "s2",
    name: "佐藤花子",
    university: "京都大学医学部",
    grad_year: 2026,
    interests: "地域医療に貢献したく、総合診療を学びたい。へき地医療実習の経験あり。",
    preferredAreas: ["京都府", "大阪府", "長野県"],
    preferredDepartments: ["総合診療科", "内科"],
    desiredSalary: "400万円以上",
    duty: "相談",
    visitWish: "長期休みのみ",
    travelSupport: "問わない",
    tag: "viewed",
  },
  {
    id: "s3",
    name: "鈴木一郎",
    university: "大阪大学医学部",
    grad_year: 2025,
    interests: "外科志望で手技経験を重ねたい。研究も継続希望。",
    preferredAreas: ["大阪府", "兵庫県"],
    preferredDepartments: ["外科", "整形外科"],
    desiredSalary: "600万円以上",
    duty: "可能",
    visitWish: "すぐ可能",
    travelSupport: "あり",
    tag: "favorited",
  },
];

/* ============================================================
   ページ本体
============================================================ */
export default function HospitalStudentsPage() {
  // ★ useSearchParams は使わずに URL から tag を読む
  const [tag, setTag] = useState<"applied" | "viewed" | "favorited" | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = new URLSearchParams(window.location.search).get("tag");
    if (t === "applied" || t === "viewed" || t === "favorited") setTag(t);
  }, []);

  // Provider
  const { sendScout } = useScoutsOutbox();
  const { isFavorite, toggleFavorite } = useFavoriteStudents();

  const [selectedYears, setSelectedYears] = useState<number | "未選択">("未選択");
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [salary, setSalary] = useState<string>("指定なし");
  const [duty, setDuty] = useState<typeof DUTY_OPTIONS[number]>("問わない");
  const [visitWish, setVisitWish] = useState<typeof OBSERVE_OPTIONS[number]>("すぐ可能");
  const [travelSupport, setTravelSupport] = useState<typeof TRAVEL_SUPPORT_OPTIONS[number]>("問わない");

  const filtered = useMemo(() => {
    return DUMMY_STUDENTS.filter((s) => {
      if (tag && s.tag !== tag) return false;
      if (selectedYears !== "未選択" && s.grad_year !== selectedYears) return false;

      // 診療科：OR一致
      if (selectedDepartments.size > 0) {
        const ok = Array.from(selectedDepartments).some((dep) =>
          s.preferredDepartments.includes(dep)
        );
        if (!ok) return false;
      }
      // エリア：OR一致
      if (selectedAreas.size > 0) {
        const ok = Array.from(selectedAreas).some((area) =>
          s.preferredAreas.includes(area)
        );
        if (!ok) return false;
      }

      if (salary !== "指定なし" && s.desiredSalary !== salary) return false;
      if (duty !== "問わない" && s.duty !== duty) return false;
      if (visitWish && s.visitWish !== visitWish) return false;
      if (travelSupport !== "問わない" && s.travelSupport !== travelSupport) return false;
      return true;
    });
  }, [
    tag,
    selectedYears,
    selectedDepartments,
    selectedAreas,
    salary,
    duty,
    visitWish,
    travelSupport,
  ]);

  // Setユーティリティ
  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const toggleDepartment = (dep: string) =>
    setSelectedDepartments((prev) => toggleSet(prev, dep));
  const toggleArea = (pref: string) =>
    setSelectedAreas((prev) => toggleSet(prev, pref));

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
    setSelectedYears("未選択");
    setSelectedDepartments(new Set());
    setSelectedAreas(new Set());
    setSalary("指定なし");
    setDuty("問わない");
    setVisitWish("すぐ可能");
    setTravelSupport("問わない");
  };

  const scoutHref = (id: string) =>
    `/hospital/scouts/new?studentId=${encodeURIComponent(id)}`;

  return (
    <main className="max-w-6xl mx-auto px-8 py-6 space-y-8">
      <div>
        <h1>学生検索</h1>
        <p className="text-text-muted">
          {tag
            ? `表示中：${
                tag === "applied"
                  ? "今月の応募"
                  : tag === "viewed"
                  ? "プロフィール閲覧"
                  : "お気に入り"
              } の学生`
            : "条件を選ぶと右側に結果が即時反映されます。気になる学生は★で保存。"}
        </p>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* ===== サイドバー（検索条件） ===== */}
        <aside className="card h-fit p-5 sticky top-4 self-start">
          <h2 className="text-sm font-semibold text-primary-700 mb-4 flex items-center gap-2">
            🔍 検索条件
          </h2>

          {/* 卒業年度 */}
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              卒業年度
            </summary>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary-300"
              value={selectedYears === "未選択" ? "" : String(selectedYears)}
              onChange={(e) =>
                setSelectedYears(e.target.value ? Number(e.target.value) : "未選択")
              }
            >
              <option value="">選択してください</option>
              {GRAD_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年卒
                </option>
              ))}
            </select>
          </details>

          {/* 志望診療科（複数選択） */}
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              志望診療科（複数選択可）
            </summary>

            <div className="space-y-4 max-h-72 overflow-auto pr-2">
              {DEPARTMENTS_GROUPED.map((group) => {
                const selectAll = () => {
                  setSelectedDepartments((prev) => {
                    const next = new Set(prev);
                    group.items.forEach((dep) => next.add(dep));
                    return next;
                  });
                };
                const clearAll = () => {
                  setSelectedDepartments((prev) => {
                    const next = new Set(prev);
                    group.items.forEach((dep) => next.delete(dep));
                    return next;
                  });
                };

                return (
                  <div key={group.group} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{group.group}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAll}
                          className="text-xs px-2 py-1 border rounded-md text-primary-600 border-primary-400 hover:bg-primary-50"
                        >
                          全選択
                        </button>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-xs px-2 py-1 border rounded-md text-text-muted hover:bg-gray-50"
                        >
                          解除
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      {group.items.map((dep) => (
                        <label key={dep} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="accent-primary-500"
                            checked={selectedDepartments.has(dep)}
                            onChange={() =>
                              setSelectedDepartments((prev) => {
                                const next = new Set(prev);
                                if (next.has(dep)) next.delete(dep);
                                else next.add(dep);
                                return next;
                              })
                            }
                          />
                          <span>{dep}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>

          {/* 希望エリア */}
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              希望エリア（複数選択可）
            </summary>

            <div className="space-y-4 max-h-72 overflow-auto pr-2">
              {REGIONS.map((region) => (
                <div key={region.name} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{region.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectRegionAll(region.name)}
                        className="text-xs px-2 py-1 border rounded-md text-primary-600 border-primary-400 hover:bg-primary-50"
                        title="この地方を全選択"
                      >
                        全選択
                      </button>
                      <button
                        type="button"
                        onClick={() => clearRegionAll(region.name)}
                        className="text-xs px-2 py-1 border rounded-md text-text-muted hover:bg-gray-50"
                        title="解除"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {region.prefs.map((pref) => (
                      <label key={pref} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-primary-500"
                          checked={selectedAreas.has(pref)}
                          onChange={() => toggleArea(pref)}
                        />
                        <span>{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* 希望年収 */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              希望年収
            </summary>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary-300"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            >
              {SALARY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </details>

          {/* 当直可否 */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              当直可否
            </summary>
            <div className="space-y-2 text-sm">
              {DUTY_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="duty"
                    value={opt}
                    checked={duty === opt}
                    onChange={() => setDuty(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </details>

          {/* 見学希望 */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              見学希望
            </summary>
            <div className="space-y-2 text-sm">
              {OBSERVE_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visit"
                    value={opt}
                    checked={visitWish === opt}
                    onChange={() => setVisitWish(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </details>

          {/* 交通費補助 */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-text mb-2 select-none">
              交通費補助希望
            </summary>
            <div className="space-y-2 text.sm">
              {TRAVEL_SUPPORT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="travel"
                    value={opt}
                    checked={travelSupport === opt}
                    onChange={() => setTravelSupport(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </details>

          <div className="flex flex-col gap-2 pt-2">
            <button className="btn-primary text-sm">検索</button>
            <button
              type="button"
              onClick={clearAll}
              className="border border-primary-500 text-primary-600 rounded-md py-2 text-sm hover:bg-primary-50 transition"
            >
              条件をクリア
            </button>
          </div>
        </aside>

        {/* ====== 検索結果 ====== */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">{filtered.length}件の学生が見つかりました</p>
            <select className="border rounded-md px-3 py-1 text-sm focus:ring focus:ring-primary-300">
              <option>新着順</option>
              <option>卒年が近い順</option>
            </select>
          </div>

          {filtered.map((s) => (
            <div key={s.id} className="card p-5 hover:shadow-md transition space-y-3">
              {/* ヘッダ */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-primary-700">{s.name}</h3>
                  <p className="text-sm text-text-muted">{s.university}・{s.grad_year}年卒</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 border rounded-full bg-primary-50 text-primary-700">見学：{s.visitWish}</span>
                  <span className="px-2 py-1 border rounded-full bg-gray-50 text-text-muted">当直：{s.duty}</span>
                </div>
              </div>

              {/* 自己PR */}
              <p className="text-sm text-text">{s.interests}</p>

              {/* 詳細情報 */}
              <div className="grid md:grid-cols-2 gap-2 text-sm text-text-muted">
                <p><span className="font-medium">希望エリア：</span>{s.preferredAreas.join("、")}</p>
                <p><span className="font-medium">志望診療科：</span>{s.preferredDepartments.join("、")}</p>
                <p><span className="font-medium">希望年収：</span>{s.desiredSalary ?? "—"}</p>
                <p><span className="font-medium">交通費補助希望：</span>{s.travelSupport}</p>
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
                  href={scoutHref(s.id)}
                  className="border border-primary-500 text-primary-600 rounded-md px-4 py-1 text-sm hover:bg-primary-50 transition inline-block"
                >
                  スカウト
                </Link>

                {/* お気に入り（病院側） */}
                <button
                  onClick={() =>
                    toggleFavorite({
                      id: s.id,
                      name: s.name,
                      university: s.university,
                      gradYear: String(s.grad_year),
                    })
                  }
                  className={`border rounded-md px-4 py-1 text-sm hover:bg-gray-50 transition ${
                    isFavorite(s.id) ? "border-primary-500 text-primary-600" : ""
                  }`}
                  title={isFavorite(s.id) ? "お気に入り解除" : "お気に入りに追加"}
                >
                  {isFavorite(s.id) ? "お気に入り解除" : "お気に入り"}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card text-center py-10 text-text-muted">
              条件に合致する学生が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---- ヘルパー ---- */
function scoutHref(id: string) {
  return `/hospital/scouts/new?studentId=${encodeURIComponent(id)}`;
}