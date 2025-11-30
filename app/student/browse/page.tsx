"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/* =======================
   マスタ定義
======================= */
const SALARY = ["〜400万円", "400〜599万円", "600〜799万円", "800万円以上", "問わない"] as const;
type Salary = (typeof SALARY)[number];

const FACILITY = ["二次救急", "三次救急", "どちらでも"] as const;
type Facility = (typeof FACILITY)[number];

const NIGHTS = ["〜2回", "3〜4回", "5回〜", "問わない"] as const;
type Nights = (typeof NIGHTS)[number];

const BEDS = ["〜199床", "200〜399床", "400〜599床", "600床以上", "問わない"] as const;
type BedRange = (typeof BEDS)[number];

const HOUSING = ["あり", "問わない"] as const;
type Housing = (typeof HOUSING)[number];

// 47都道府県（地方グルーピング）
const PREF_GROUPS: { name: string; prefs: string[] }[] = [
  { name: "北海道・東北", prefs: ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"] },
  { name: "関東", prefs: ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"] },
  { name: "北陸・甲信越", prefs: ["新潟県","富山県","石川県","福井県","山梨県","長野県"] },
  { name: "東海", prefs: ["岐阜県","静岡県","愛知県","三重県"] },
  { name: "近畿", prefs: ["滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"] },
  { name: "中国", prefs: ["鳥取県","島根県","岡山県","広島県","山口県"] },
  { name: "四国", prefs: ["徳島県","香川県","愛媛県","高知県"] },
  { name: "九州・沖縄", prefs: ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"] },
];

/* =======================
   型（public.hospitals_resolved）
======================= */
type HospitalRow = {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  city: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  duty_frequency: "~2回" | "3~4回" | "5回以上" | "特になし" | null;
  website_url: string | null;
  other_benefits: string | null;
};

/* =======================
   ページ
======================= */
export default function StudentHospitalSearchPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // 条件
  const [nameQuery, setNameQuery] = useState("");
  const qName = useDebouncedValue(nameQuery, 250);

  const [facility, setFacility] = useState<Facility>("どちらでも");
  const [salary, setSalary] = useState<Salary>("問わない");
  const [nights, setNights] = useState<Nights>("問わない");

  // 詳細条件
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bedRange, setBedRange] = useState<BedRange>("問わない");
  const [housing, setHousing] = useState<Housing>("問わない");

  // 47都道府県（複数）
  const [prefSet, setPrefSet] = useState<Set<string>>(new Set());

  // 結果
  const [rows, setRows] = useState<HospitalRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ---------- util: Set トグル / 地方一括 ---------- */
  const toggleSet = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const selectRegion = (g: { name: string; prefs: string[] }) =>
    setPrefSet(prev => { const next = new Set(prev); g.prefs.forEach(p => next.add(p)); return next; });

  const clearRegion = (g: { name: string; prefs: string[] }) =>
    setPrefSet(prev => { const next = new Set(prev); g.prefs.forEach(p => next.delete(p)); return next; });

  /* ---------- Supabase 検索 ---------- */
  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("hospitals_resolved")
        .select(
          "*",
          { count: "exact" }
        )
        .limit(200);

      // 病院名：部分一致
      const s = qName.trim();
      if (s) q = q.ilike("name", `%${escapeIlike(s)}%`);

      // 都道府県 in
      if (prefSet.size > 0) q = q.in("prefecture", Array.from(prefSet));

      // 救急区分
      if (facility !== "どちらでも") q = q.eq("facility_type", facility);

      // 初年度年収帯
      switch (salary) {
        case "〜400万円":
          q = q.lte("salary_1st_year_min", 400);
          break;
        case "400〜599万円":
          q = q.gte("salary_1st_year_min", 400).lte("salary_1st_year_min", 599);
          break;
        case "600〜799万円":
          q = q.gte("salary_1st_year_min", 600).lte("salary_1st_year_min", 799);
          break;
        case "800万円以上":
          q = q.gte("salary_1st_year_min", 800);
          break;
        case "問わない":
        default:
          break;
      }

      // 当直回数：文字一致（問わない = 条件なし）
      if (nights !== "問わない") {
        const map: Record<Nights, HospitalRow["duty_frequency"]> = {
          "〜2回": "~2回",
          "3〜4回": "3~4回",
          "5回〜": "5回以上",
          "問わない": null,
        };
        q = q.eq("duty_frequency", map[nights]!);
      }

      // 病床数レンジ
      switch (bedRange) {
        case "〜199床":
          q = q.lte("bed_count", 199);
          break;
        case "200〜399床":
          q = q.gte("bed_count", 200).lte("bed_count", 399);
          break;
        case "400〜599床":
          q = q.gte("bed_count", 400).lte("bed_count", 599);
          break;
        case "600床以上":
          q = q.gte("bed_count", 600);
          break;
        case "問わない":
        default:
          break;
      }

      // 家賃手当の有無（other_benefits に特定の文言が含まれるか）
      if (housing === "あり") {
        // 住宅手当 / 住居手当 / 家賃補助 / 住宅補助 のいずれかを含む
        q = q.or(
          [
            "other_benefits.ilike.%住宅手当%",
            "other_benefits.ilike.%住居手当%",
            "other_benefits.ilike.%家賃補助%",
            "other_benefits.ilike.%住宅補助%",
          ].join(",")
        );
      }

      const { data, error, count: c } = await q;
      if (error) throw error;

      setRows((data ?? []) as HospitalRow[]);
      setCount(c ?? 0);
    } catch (e: any) {
      console.error("[browse] load error:", e.message);
      alert(`検索に失敗しました：${e.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qName, facility, salary, nights, bedRange, housing, prefSet]); // 条件が変わる度に再検索

  const clearAll = () => {
    setNameQuery("");
    setFacility("どちらでも");
    setSalary("問わない");
    setNights("問わない");
    setBedRange("問わない");
    setHousing("問わない");
    setPrefSet(new Set());
    setTimeout(load, 0);
  };

  /* ---------- UI ---------- */
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">病院を探す</h1>
        <p className="text-sm text-gray-600">
          病院名の部分一致 + 都道府県 / 救急区分 / 年収帯 / 当直回数（AND）。詳細条件で病床数・家賃手当も絞り込めます。
        </p>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4 md:gap-8">
        {/* 条件 */}
        <aside className="card p-4 space-y-4">
          {/* 病院名 */}
          <div>
            <label className="block text-sm text-gray-700">病院名</label>
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="例：赤十字 / 順天堂 など"
            />
          </div>

          {/* 都道府県（グルーピング） */}
          <div>
            <div className="text-sm font-semibold text-primary-700 mb-2">
              希望勤務地（都道府県）
            </div>
            <div className="space-y-3 max-h-80 overflow-auto pr-2">
              {PREF_GROUPS.map((g) => (
                <div key={g.name} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{g.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectRegion(g)}
                        className="text-xs px-2 py-0.5 border rounded"
                      >
                        全選択
                      </button>
                      <button
                        type="button"
                        onClick={() => clearRegion(g)}
                        className="text-xs px-2 py-0.5 border rounded"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    {g.prefs.map((p) => (
                      <label key={p} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-primary-500"
                          checked={prefSet.has(p)}
                          onChange={() => setPrefSet((prev) => toggleSet(prev, p))}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 基本条件（ラジオ群） */}
          <SelectGroup
            title="救急受け入れ"
            value={facility}
            options={FACILITY}
            onChange={setFacility}
          />
          <SelectGroup
            title="希望年収（初年度）"
            value={salary}
            options={SALARY}
            onChange={setSalary}
          />
          <SelectGroup
            title="当直回数"
            value={nights}
            options={NIGHTS}
            onChange={setNights}
          />

          {/* 詳細条件トグル */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs text-primary-700 underline"
            >
              {showAdvanced ? "詳細条件を閉じる" : "詳細条件で検索する"}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <SelectGroup
                  title="病床数"
                  value={bedRange}
                  options={BEDS}
                  onChange={setBedRange}
                />
                <SelectGroup
                  title="家賃・住宅手当"
                  value={housing}
                  options={HOUSING}
                  onChange={setHousing}
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button type="button" onClick={load} className="btn-primary text-sm">
              検索
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="border rounded py-2 text-sm hover:bg-gray-50"
            >
              条件をクリア
            </button>
          </div>
        </aside>

        {/* 結果 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? "検索中…" : `${count}件の病院が見つかりました`}
            </p>
          </div>

          {rows.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border bg-white p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-primary-700">
                    {h.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] md:text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">
                      {h.prefecture ?? "—"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">
                      {h.facility_type ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/student/apply?hospitalId=${encodeURIComponent(h.id)}`}
                    className="px-3 py-1.5 rounded bg-primary-600 text-white text-sm hover:bg-primary-700"
                  >
                    初回面談を申し込む
                  </Link>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-gray-700">
                <div>
                  <span className="text-gray-500">年収：</span>
                  {h.salary_1st_year_min
                    ? `${h.salary_1st_year_min}万〜${h.salary_1st_year_max ?? "—"}万`
                    : "—"}
                </div>
                <div>
                  <span className="text-gray-500">研修医数：</span>
                  {h.residents_first_year ?? "—"}
                </div>
                <div>
                  <span className="text-gray-500">病床数：</span>
                  {h.bed_count ?? "—"}
                </div>
                <div>
                  <span className="text-gray-500">当直：</span>
                  {h.duty_frequency ?? "—"}
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Link
                  href={`/student/hospitals/${encodeURIComponent(h.id)}`}
                  className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                >
                  詳細を見る
                </Link>
              </div>
            </div>
          ))}

          {!loading && rows.length === 0 && (
            <div className="p-10 text-center text-gray-500 border rounded bg-gray-50">
              条件に合致する病院が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* =======================
   小さな部品 / util
======================= */
function SelectGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-primary-700 mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="text-sm">
            <input
              type="radio"
              className="mr-1"
              checked={value === o}
              onChange={() => onChange(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

/** ilike のワイルドカードをエスケープ */
function escapeIlike(s: string) {
  return s.replace(/[%_]/g, (m) => "\\" + m);
}

/** デバウンス */
function useDebouncedValue<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setV(value), ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ms]);
  return v;
}