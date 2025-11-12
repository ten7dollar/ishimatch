"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/* ========== マスタ ========== */
const REGIONS = [
  "北海道",
  "東北",
  "関東",
  "北陸・甲信越",
  "東海",
  "近畿",
  "中国",
  "四国",
  "九州・沖縄",
] as const;
type Region = (typeof REGIONS)[number];

const FACILITY = ["二次救急", "三次救急", "どちらでも"] as const;
type Facility = (typeof FACILITY)[number];

const SALARY = ["〜400万円", "400〜599万円", "600〜799万円", "800万円以上", "問わない"] as const;
type Salary = (typeof SALARY)[number];

/* ========== 型（public.hospitals） ========== */
type HospitalRow = {
  id: string;
  name: string;
  region: string | null;
  prefecture: string | null;
  city: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  website_url: string | null;
  /** ★ ここを追加 */
  duty_frequency: string | null;
};

/* ========== ページ ========== */
export default function StudentHospitalSearchPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // 検索条件
  const [nameQuery, setNameQuery] = useState("");
  const debouncedName = useDebouncedValue(nameQuery, 250);

  const [region, setRegion] = useState<Region | "すべて">("すべて");
  const [facility, setFacility] = useState<Facility>("どちらでも");
  const [salary, setSalary] = useState<Salary>("問わない");

  // 結果
  const [rows, setRows] = useState<HospitalRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("hospitals")
        .select(
          // duty_frequency を含める
          "id,name,region,prefecture,city,facility_type,bed_count,residents_first_year,salary_1st_year_min,salary_1st_year_max,website_url,duty_frequency",
          { count: "exact" }
        )
        .limit(200);

      // 名前部分一致
      const qStr = debouncedName.trim();
      if (qStr) {
        q = q.ilike("name", `%${escapeIlike(qStr)}%`);
      }

      // エリア
      if (region !== "すべて") {
        q = q.eq("region", region);
      }

      // 救急区分
      if (facility !== "どちらでも") {
        q = q.eq("facility_type", facility);
      }

      // 年収帯（salary_1st_year_min でフィルタ）
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
          // 何もしない
          break;
      }

      const { data, error, count } = await q;
      if (error) throw error;

      setRows((data ?? []) as HospitalRow[]);
      setCount(count ?? 0);
    } catch (e: any) {
      console.error("[browse] load error", e.message);
      alert(`検索に失敗しました：${e.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [region, facility, debouncedName, salary]); // 条件が変わる度に実行

  const clearAll = () => {
    setNameQuery("");
    setRegion("すべて");
    setFacility("どちらでも");
    setSalary("問わない");
    setTimeout(load, 0);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* タイトル */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">病院を探す</h1>
        <p className="text-sm text-gray-600">病院名（部分一致）＋ エリア / 救急区分 / 年収帯 の簡易検索</p>
      </div>

      {/* 検索フォーム */}
      <div className="grid md:grid-cols-[320px_1fr] gap-4 md:gap-8">
        {/* 左：条件 */}
        <aside className="card p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-700">病院名</label>
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="例：赤十字 / 順天堂 など"
            />
          </div>

          <SelectGroup
            title="エリア"
            value={region}
            options={["すべて", ...REGIONS]}
            onChange={setRegion}
          />

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

          <div className="pt-2 flex flex-col gap-2">
            <button type="button" onClick={load} className="btn-primary text-sm">
              検索
            </button>
            <button type="button" onClick={clearAll} className="border rounded py-2 text-sm hover:bg-gray-50">
              条件をクリア
            </button>
          </div>
        </aside>

        {/* 右：結果 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? "検索中…" : `${count}件の病院が見つかりました`}
            </p>
          </div>

          {rows.map((h) => (
            <div key={h.id} className="rounded-xl border bg白 p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-primary-700">{h.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] md:text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">
                      {h.region ?? "—"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">
                      {h.prefecture ?? "—"}・{h.city ?? "—"}
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
                  {h.salary_1st_year_min ? `${h.salary_1st_year_min}万〜${h.salary_1st_year_max ?? "—"}万` : "—"}
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

              <div className="mt-3 flex justify-end">
                <Link href={`/student/hospitals/${encodeURIComponent(h.id)}`} className="px-3 py-1.5 rounded border text-sm hover:bg-primary-50">
                  詳細を見る
                </Link>
              </div>
            </div>
          ))}

          {!loading && rows.length === 0 && (
            <div className="p-10 text-center text-gray-500 border rounded">
              条件に合致する病院が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ========== 小さな部品 / util ========== */
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
      <select
        className="border rounded px-3 py-2 w-full text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/** ilike のワードをエスケープ */
function escapeIlike(s: string) {
  return s.replace(/[%_]/g, (m) => "\\" + m);
}

/** デバウンス */
function useDebouncedValue<T>(value: T, ms: number) {
  const [v, setValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setValue(value), ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ms]);
  return v;
}