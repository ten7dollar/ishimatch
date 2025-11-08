"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/* ---------------------------
   マスタ定義（将来はDBやAPIへ）
--------------------------- */
const START_YEARS = [2026, 2027, 2028] as const;

const REGIONS: { name: string; prefs: string[] }[] = [
  { name: "北海道・東北", prefs: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { name: "関東",       prefs: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
  { name: "北陸・甲信越", prefs: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県"] },
  { name: "東海",       prefs: ["岐阜県", "静岡県", "愛知県", "三重県"] },
  { name: "近畿",       prefs: ["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
  { name: "中国",       prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
  { name: "四国",       prefs: ["徳島県", "香川県", "愛媛県", "高知県"] },
  { name: "九州・沖縄",  prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
];

const SALARY_BANDS = ["〜400万円", "400〜599万円", "600〜799万円", "800万円以上", "問わない"] as const;
const BONUS = ["あり", "なし", "問わない"] as const;
const EMERGENCY = ["二次救急", "三次救急", "どちらでも良い"] as const;
const INTERNS = ["〜5人", "6〜10人", "11〜20人", "21人〜", "問わない"] as const;
const BEDS = ["〜100床", "100〜300床", "300〜499床", "500床〜", "問わない"] as const;
const NIGHTS = ["〜2回", "3〜4回", "5回〜", "問わない"] as const;
const TRAVEL = ["あり", "なし", "問わない"] as const;
const WELFARE = ["残業手当", "家賃手当", "当直手当", "問わない"] as const;

/* ---------------------------
   型
--------------------------- */
type StartYear = (typeof START_YEARS)[number];
type AndOr = "AND" | "OR";

type Hospital = {
  id: string;
  name: string;
  prefecture: string;               // 都道府県
  startYears: StartYear[];          // 受入開始年度
  salaryBand: (typeof SALARY_BANDS)[number];
  bonus: (typeof BONUS)[number];
  emergency: (typeof EMERGENCY)[number];
  interns: (typeof INTERNS)[number];
  beds: (typeof BEDS)[number];
  nights: (typeof NIGHTS)[number];
  travel: (typeof TRAVEL)[number];
  welfare: (typeof WELFARE)[number][]; // 複数選択（問わない含まず）
};

/* ---------------------------
   ダミーデータ（将来差し替え）
--------------------------- */
const DUMMY_HOSPITALS: Hospital[] = [
  {
    id: "tokyo-chuo",
    name: "東京中央医療センター",
    prefecture: "東京都",
    startYears: [2026, 2027],
    salaryBand: "400〜599万円",
    bonus: "あり",
    emergency: "三次救急",
    interns: "11〜20人",
    beds: "500床〜",
    nights: "3〜4回",
    travel: "あり",
    welfare: ["残業手当", "家賃手当"],
  },
  {
    id: "shinshu",
    name: "信州地域総合病院",
    prefecture: "長野県",
    startYears: [2026, 2028],
    salaryBand: "600〜799万円",
    bonus: "あり",
    emergency: "二次救急",
    interns: "6〜10人",
    beds: "300〜499床",
    nights: "〜2回",
    travel: "あり",
    welfare: ["残業手当", "当直手当"],
  },
  {
    id: "osaka-daigaku",
    name: "大阪大学医学部附属病院",
    prefecture: "大阪府",
    startYears: [2027, 2028],
    salaryBand: "〜400万円",
    bonus: "なし",
    emergency: "三次救急",
    interns: "21人〜",
    beds: "500床〜",
    nights: "5回〜",
    travel: "なし",
    welfare: ["家賃手当", "当直手当"],
  },
];

/* ---------------------------
   ページ
--------------------------- */
export default function StudentHospitalSearchPage() {
  // 病院名検索（部分一致）
  const [nameQuery, setNameQuery] = useState("");

  // AND/OR モード
  const [mode, setMode] = useState<AndOr>("AND");

  // フィルタの状態
  const [prefSet, setPrefSet] = useState<Set<string>>(new Set()); // 47都道府県（複数）
  const [startYears, setStartYears] = useState<Set<StartYear>>(new Set());
  const [salary, setSalary] = useState<(typeof SALARY_BANDS)[number]>("問わない");
  const [bonus, setBonus] = useState<(typeof BONUS)[number]>("問わない");
  const [emergency, setEmergency] = useState<(typeof EMERGENCY)[number]>("どちらでも良い");
  const [interns, setInterns] = useState<(typeof INTERNS)[number]>("問わない");
  const [beds, setBeds] = useState<(typeof BEDS)[number]>("問わない");
  const [nights, setNights] = useState<(typeof NIGHTS)[number]>("問わない");
  const [travel, setTravel] = useState<(typeof TRAVEL)[number]>("問わない");
  const [welfare, setWelfare] = useState<Set<(typeof WELFARE)[number]>>(new Set());

  // 選択トグル（Set 用）
  const toggleSet = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  // 地方一括
  const selectRegion = (r: { name: string; prefs: string[] }) => setPrefSet(prev => {
    const next = new Set(prev); r.prefs.forEach(p => next.add(p)); return next;
  });
  const clearRegion = (r: { name: string; prefs: string[] }) => setPrefSet(prev => {
    const next = new Set(prev); r.prefs.forEach(p => next.delete(p)); return next;
  });

  // 検索ロジック（AND/OR 切替 & 「問わない」の意味）
  const results = useMemo(() => {
    const query = nameQuery.trim();

    // 1) グループごとの「一致 or 未指定(undefined)」を出す helper
    //    AND: undefined は評価から除外（＝条件なし）
    //    OR : undefined は false 扱い（どれか1つでも true ならOK）
    const group = {
      name(h: Hospital): boolean | undefined {
        if (!query) return undefined;
        return h.name.toLowerCase().includes(query.toLowerCase());
      },
      prefecture(h: Hospital): boolean | undefined {
        if (prefSet.size === 0) return undefined;
        return prefSet.has(h.prefecture);
      },
      startYear(h: Hospital): boolean | undefined {
        if (startYears.size === 0) return undefined;
        return Array.from(startYears).some(y => h.startYears.includes(y));
      },
      salary(h: Hospital): boolean | undefined {
        // 「問わない」
        if (salary === "問わない") return mode === "OR" ? true : undefined;
        return h.salaryBand === salary;
      },
      bonus(h: Hospital): boolean | undefined {
        if (bonus === "問わない") return mode === "OR" ? true : undefined;
        return h.bonus === bonus;
      },
      emergency(h: Hospital): boolean | undefined {
        if (emergency === "どちらでも良い") return mode === "OR" ? true : undefined;
        return h.emergency === emergency;
      },
      interns(h: Hospital): boolean | undefined {
        if (interns === "問わない") return mode === "OR" ? true : undefined;
        return h.interns === interns;
      },
      beds(h: Hospital): boolean | undefined {
        if (beds === "問わない") return mode === "OR" ? true : undefined;
        return h.beds === beds;
      },
      nights(h: Hospital): boolean | undefined {
        if (nights === "問わない") return mode === "OR" ? true : undefined;
        return h.nights === nights;
      },
      travel(h: Hospital): boolean | undefined {
        if (travel === "問わない") return mode === "OR" ? true : undefined;
        return h.travel === travel;
      },
      welfare(h: Hospital): boolean | undefined {
        if (welfare.size === 0) return undefined;      // 未選択
        if (welfare.has("問わない" as any))            // 「問わない」
          return mode === "OR" ? true : undefined;
        // 複数選択：病院の福利厚生に選択のどれかが含まれる
        return Array.from(welfare).some(w => h.welfare.includes(w));
      },
    };

    // 2) 病院ごとに判定
    return DUMMY_HOSPITALS.filter((h) => {
      const checks = [
        group.name(h),
        group.prefecture(h),
        group.startYear(h),
        group.salary(h),
        group.bonus(h),
        group.emergency(h),
        group.interns(h),
        group.beds(h),
        group.nights(h),
        group.travel(h),
        group.welfare(h),
      ];

      if (mode === "AND") {
        // undefined（条件なし）は除外し、true がすべて
        const targets = checks.filter(v => v !== undefined) as boolean[];
        return targets.length === 0 ? true : targets.every(Boolean);
      } else {
        // OR：undefined は false 扱い。どれか1つtrue ならOK
        return checks.some(Boolean);
      }
    });
  }, [nameQuery, mode, prefSet, startYears, salary, bonus, emergency, interns, beds, nights, travel, welfare]);

  const clearAll = () => {
    setNameQuery("");
    setMode("AND");
    setPrefSet(new Set());
    setStartYears(new Set());
    setSalary("問わない");
    setBonus("問わない");
    setEmergency("どちらでも良い");
    setInterns("問わない");
    setBeds("問わない");
    setNights("問わない");
    setTravel("問わない");
    setWelfare(new Set());
  };

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* タイトル */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">病院を探す</h1>
        <p className="text-sm text-gray-600">希望条件を指定して病院を絞り込みます</p>
      </div>

      {/* 病院名検索（部分一致） */}
      <div className="card p-3 md:p-4">
        <label className="text-sm text-gray-700">病院名</label>
        <input
          value={nameQuery}
          onChange={(e)=>setNameQuery(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-1"
          placeholder="病院名で検索（部分一致）"
        />
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 md:gap-8">
        {/* サイドバー */}
        <aside className="card h-fit p-4 md:p-5 sticky top-4 self-start space-y-3">
          {/* AND/OR */}
          <div>
            <div className="text-sm font-semibold text-primary-700 mb-2">検索モード</div>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode==="AND"} onChange={()=>setMode("AND")} />
                AND（すべて満たす）
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode==="OR"} onChange={()=>setMode("OR")} />
                OR（いずれかを満たす）
              </label>
            </div>
          </div>

          {/* 希望勤務地 */}
          <details open>
            <summary className="cursor-pointer text-sm font-semibold text-primary-700 mb-2 select-none">
              希望勤務地
            </summary>
            <p className="text-xs text-gray-500 mb-2">地方を選ぶか、都道府県を個別に選べます</p>

            <div className="space-y-3 max-h-72 overflow-auto pr-2">
              {REGIONS.map(r => (
                <div key={r.name} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.name}</span>
                    <div className="flex gap-2">
                      <button onClick={()=>selectRegion(r)} className="text-xs px-2 py-0.5 border rounded">
                        全選択
                      </button>
                      <button onClick={()=>clearRegion(r)} className="text-xs px-2 py-0.5 border rounded">
                        解除
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    {r.prefs.map(p => (
                      <label key={p} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-primary-500"
                          checked={prefSet.has(p)}
                          onChange={()=>setPrefSet(prev => toggleSet(prev, p))}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* 研修開始年度 */}
          <details open>
            <summary className="cursor-pointer text-sm font-semibold text-primary-700 mb-2 select-none">
              研修開始年度
            </summary>
            <div className="flex flex-wrap gap-2">
              {START_YEARS.map(y => (
                <label key={y} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={startYears.has(y)}
                    onChange={()=>setStartYears(prev => toggleSet(prev, y))}
                  />
                  {y}年
                </label>
              ))}
            </div>
          </details>

          {/* ラジオ系（問わないあり） */}
          <RadioGroup
            title="希望年収（初年度）"
            options={SALARY_BANDS}
            value={salary}
            onChange={setSalary}
          />
          <RadioGroup title="賞与" options={BONUS} value={bonus} onChange={setBonus} />
          <RadioGroup title="救急受け入れ" options={EMERGENCY} value={emergency} onChange={setEmergency} />
          <RadioGroup title="初期研修医の人数" options={INTERNS} value={interns} onChange={setInterns} />
          <RadioGroup title="病床数" options={BEDS} value={beds} onChange={setBeds} />
          <RadioGroup title="当直回数" options={NIGHTS} value={nights} onChange={setNights} />
          <RadioGroup title="見学時の交通費補助" options={TRAVEL} value={travel} onChange={setTravel} />

          {/* 福利厚生（複数） */}
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-primary-700 mb-2 select-none">
              福利厚生
            </summary>
            <div className="flex flex-wrap gap-2 mt-2">
              {WELFARE.map(w => (
                <label key={w} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={welfare.has(w)}
                    onChange={()=>setWelfare(prev => toggleSet(prev, w))}
                  />
                  {w}
                </label>
              ))}
            </div>
          </details>

          <div className="pt-2 flex flex-col gap-2">
            <button className="btn-primary text-sm">検索</button>
            <button onClick={clearAll} className="border rounded py-2 text-sm hover:bg-gray-50">
              条件をクリア
            </button>
          </div>
        </aside>

        {/* 結果リスト（モバイルファーストのスマートなカード） */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{results.length}件の病院が見つかりました</p>
            <select className="border rounded px-3 py-1 text-sm">
              <option>並び順：新着順</option>
            </select>
          </div>

          {results.map(h => (
            <div key={h.id} className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
              {/* 病院名 ＋ タグ */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-primary-700">{h.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] md:text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">{h.prefecture}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">{h.emergency}</span>
                    {h.bonus === "あり" && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">賞与あり</span>
                    )}
                  </div>
                </div>

                {/* 右側：スマホでも押しやすいCTA */}
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/student/apply?hospitalId=${encodeURIComponent(h.id)}`}
                    className="px-3 py-1.5 rounded bg-primary-600 text-white text-sm hover:bg-primary-700"
                  >
                    初回面談を申し込む
                  </Link>
                </div>
              </div>

              {/* 主要スペック（スリム） */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-gray-700">
                <div><span className="text-gray-500">年収：</span>{h.salaryBand}</div>
                <div><span className="text-gray-500">研修医数：</span>{h.interns}</div>
                <div><span className="text-gray-500">病床数：</span>{h.beds}</div>
                <div><span className="text-gray-500">当直：</span>{h.nights}</div>
              </div>

              {/* 下部ボタン */}
              <div className="mt-3 flex justify-end">
                <Link href={`/student/hospitals/${encodeURIComponent(h.id)}`} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">
                  詳細を見る
                </Link>
              </div>
            </div>
          ))}

          {results.length === 0 && (
            <div className="p-10 text-center text-gray-500 border rounded bg-gray-50">
              条件に合致する病院が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------------------------
   小さな部品
--------------------------- */
function RadioGroup<T extends string>({
  title, options, value, onChange,
}: { title:string; options: readonly T[]; value:T; onChange:(v:T)=>void }) {
  return (
    <details open>
      <summary className="cursor-pointer text-sm font-semibold text-primary-700 mb-2 select-none">
        {title}
      </summary>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1 text-sm">
            <input type="radio" checked={value===opt} onChange={()=>onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </details>
  );
}