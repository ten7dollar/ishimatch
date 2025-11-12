"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

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
const TRAVEL = ["あり", "なし", "問わない"] as const; // ← 今回は hospitals に travel カラムはないので UI では使わず将来用
const WELFARE = ["残業手当", "家賃手当", "当直手当", "問わない"] as const; // 将来の hospitals 拡張用

/* ---------------------------
   型（Supabase: public.hospitals）
--------------------------- */
type AndOr = "AND" | "OR";

type HospitalRow = {
  id: string;
  hospital_id: string;
  name: string;
  name_kana: string | null;
  prefecture: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  duty_frequency: "~2回" | "3~4回" | "5回以上" | "特になし";
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  bonus: string | null;
  housing_allowance: boolean | null;
  overtime_allowance: boolean | null;
  commute_allowance: boolean | null;
};

/* ---------------------------
   ページ
--------------------------- */
export default function StudentHospitalSearchPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HospitalRow[]>([]);
  const [count, setCount] = useState(0);

  // 病院名検索（部分一致）
  const [nameQuery, setNameQuery] = useState("");
  const nameDebounce = useDebouncedValue(nameQuery, 300);

  // AND/OR モード
  const [mode, setMode] = useState<AndOr>("AND");

  // フィルタの状態
  const [prefSet, setPrefSet] = useState<Set<string>>(new Set()); // 47都道府県（複数）
  const [startYears, setStartYears] = useState<Set<number>>(new Set()); // 将来: hospitalsに start_years を追加したら使う
  const [salary, setSalary] = useState<(typeof SALARY_BANDS)[number]>("問わない");
  const [bonus, setBonus] = useState<(typeof BONUS)[number]>("問わない");
  const [emergency, setEmergency] = useState<(typeof EMERGENCY)[number]>("どちらでも良い");
  const [interns, setInterns] = useState<(typeof INTERNS)[number]>("問わない");
  const [beds, setBeds] = useState<(typeof BEDS)[number]>("問わない");
  const [nights, setNights] = useState<(typeof NIGHTS)[number]>("問わない");
  // const [travel, setTravel] = useState<(typeof TRAVEL)[number]>("問わない"); // hospitalsに列がないためUIだけ将来対応
  // const [welfare, setWelfare] = useState<Set<(typeof WELFARE)[number]>>(new Set());

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

  /* ---------------------------
     Supabase 検索
  --------------------------- */
  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("hospitals")
        .select("*", { count: "exact" })
        .limit(200); // 必要ならページングへ

      // 病院名：部分一致（AND/ORに関係なく常にANDで足す）
      const qStr = nameDebounce.trim();
      if (qStr.length > 0) {
        const escaped = escapeIlike(qStr);
        q = q.ilike("name", `%${escaped}%`);
      }

      if (mode === "AND") {
        // within-field は OR（.in）、 across-field は AND
        if (prefSet.size > 0) q = q.in("prefecture", Array.from(prefSet));

        if (emergency !== "どちらでも良い") q = q.eq("facility_type", emergency as any);

        switch (nights) {
          case "〜2回": q = q.eq("duty_frequency", "~2回"); break;
          case "3〜4回": q = q.eq("duty_frequency", "3~4回"); break;
          case "5回〜": q = q.eq("duty_frequency", "5回以上"); break;
        }

        switch (salary) {
          case "〜400万円": q = q.lte("salary_1st_year_min", 400); break;
          case "400〜599万円": q = q.gte("salary_1st_year_min", 400).lte("salary_1st_year_min", 599); break;
          case "600〜799万円": q = q.gte("salary_1st_year_min", 600).lte("salary_1st_year_min", 799); break;
          case "800万円以上": q = q.gte("salary_1st_year_min", 800); break;
        }

        switch (interns) {
          case "〜5人": q = q.lte("residents_first_year", 5); break;
          case "6〜10人": q = q.gte("residents_first_year", 6).lte("residents_first_year", 10); break;
          case "11〜20人": q = q.gte("residents_first_year", 11).lte("residents_first_year", 20); break;
          case "21人〜": q = q.gte("residents_first_year", 21); break;
        }

        switch (beds) {
          case "〜100床": q = q.lte("bed_count", 100); break;
          case "100〜300床": q = q.gte("bed_count", 100).lte("bed_count", 300); break;
          case "300〜499床": q = q.gte("bed_count", 300).lte("bed_count", 499); break;
          case "500床〜": q = q.gte("bed_count", 500); break;
        }

        if (bonus !== "問わない") q = q.eq("bonus", bonus);
        // 福利厚生系（hospitals設計に合わせて）
        // if (housing !== "問わない") q = q.eq("housing_allowance", housing === "あり");
        // if (commute !== "問わない") q = q.eq("commute_allowance", commute === "あり");
      } else {
        // ORモード：どれか1つでも当てはまればOK
        const orParts: string[] = [];

        if (prefSet.size > 0) orParts.push(`prefecture.in.${toInList(Array.from(prefSet))}`);
        if (emergency !== "どちらでも良い") orParts.push(`facility_type.eq.${emergency}`);

        switch (nights) {
          case "〜2回": orParts.push(`duty_frequency.eq.~2回`); break;
          case "3〜4回": orParts.push(`duty_frequency.eq.3~4回`); break;
          case "5回〜": orParts.push(`duty_frequency.eq.5回以上`); break;
        }

        // salary band を and(...) で1まとまりに（PostgREST）
        switch (salary) {
          case "〜400万円": orParts.push(`salary_1st_year_min.lte.400`); break;
          case "400〜599万円": orParts.push(`and(salary_1st_year_min.gte.400,salary_1st_year_min.lte.599)`); break;
          case "600〜799万円": orParts.push(`and(salary_1st_year_min.gte.600,salary_1st_year_min.lte.799)`); break;
          case "800万円以上": orParts.push(`salary_1st_year_min.gte.800`); break;
        }

        switch (interns) {
          case "〜5人": orParts.push(`residents_first_year.lte.5`); break;
          case "6〜10人": orParts.push(`and(residents_first_year.gte.6,residents_first_year.lte.10)`); break;
          case "11〜20人": orParts.push(`and(residents_first_year.gte.11,residents_first_year.lte.20)`); break;
          case "21人〜": orParts.push(`residents_first_year.gte.21`); break;
        }

        switch (beds) {
          case "〜100床": orParts.push(`bed_count.lte.100`); break;
          case "100〜300床": orParts.push(`and(bed_count.gte.100,bed_count.lte.300)`); break;
          case "300〜499床": orParts.push(`and(bed_count.gte.300,bed_count.lte.499)`); break;
          case "500床〜": orParts.push(`bed_count.gte.500`); break;
        }

        if (bonus !== "問わない") orParts.push(`bonus.eq.${bonus}`);

        const orStr = orParts.join(",");
        if (orStr) q = q.or(orStr);
      }

      // 取得＆件数
      const { data, error, count: c } = await q;
      if (error) throw error;
      setRows((data ?? []) as HospitalRow[]);
      setCount(c ?? 0);
    } catch (e: any) {
      console.error("load error", e?.message);
      alert(`検索に失敗しました：${e?.message ?? "unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // 初回・モード切替でロード

  // 病院名はデバウンスで検索
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameDebounce]);

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
    // setTravel("問わない");
    // setWelfare(new Set());
    load();
  };

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* タイトル */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">病院を探す</h1>
        <p className="text-sm text-gray-600">病院名の部分一致 + 条件検索（AND / OR）</p>
      </div>

      {/* 病院名検索（部分一致） */}
      <div className="card p-3 md:p-4">
        <label className="text-sm text-gray-700">病院名</label>
        <input
          value={nameQuery}
          onChange={(e)=>setNameQuery(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-1"
          placeholder="病院名で検索（部分一致：例「赤十字」「順天堂」など）"
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
                      <button type="button" onClick={()=>selectRegion(r)} className="text-xs px-2 py-0.5 border rounded">
                        全選択
                      </button>
                      <button type="button" onClick={()=>clearRegion(r)} className="text-xs px-2 py-0.5 border rounded">
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

          {/* 研修開始年度（将来用） */}
          <details>
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
            <p className="text-[11px] text-gray-500 mt-1">※現状は表示に反映していません（DBに列追加後に有効化）</p>
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
          {/* <RadioGroup title="見学時の交通費補助" options={TRAVEL} value={travel} onChange={setTravel} /> */}

          <div className="pt-2 flex flex-col gap-2">
            <button type="button" onClick={load} className="btn-primary text-sm">検索</button>
            <button type="button" onClick={clearAll} className="border rounded py-2 text-sm hover:bg-gray-50">
              条件をクリア
            </button>
          </div>
        </aside>

        {/* 結果リスト */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{loading ? "検索中…" : `${count}件の病院が見つかりました`}</p>
            {/* 並び順などは必要に応じて */}
            <select className="border rounded px-3 py-1 text-sm" onChange={()=>{ /* TODO */ }}>
              <option>並び順：新着順</option>
            </select>
          </div>

          {rows.map(h => (
            <div key={h.id} className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-primary-700">{h.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] md:text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">{h.prefecture ?? "—"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">{h.facility_type ?? "—"}</span>
                    {h.bonus === "あり" && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">賞与あり</span>
                    )}
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
                <div><span className="text-gray-500">年収：</span>{h.salary_1st_year_min ? `${h.salary_1st_year_min}万〜${h.salary_1st_year_max ?? "—"}万` : "—"}</div>
                <div><span className="text-gray-500">研修医数：</span>{h.residents_first_year ?? "—"}</div>
                <div><span className="text-gray-500">病床数：</span>{h.bed_count ?? "—"}</div>
                <div><span className="text-gray-500">当直：</span>{h.duty_frequency ?? "—"}</div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Link href={`/student/hospitals/${encodeURIComponent(h.id)}`} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">
                  詳細を見る
                </Link>
                <FavButton hospitalId={h.id} />
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

/* ---------------------------
   小さな部品/ユーティリティ
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

/** ilike のワイルドカードをエスケープ */
function escapeIlike(s: string) {
  return s.replace(/[%_]/g, m => "\\" + m);
}

/** in句用リスト： ( "A","B" ) 形式 */
function toInList(arr: string[]) {
  return `(${arr.map(v => `"${v}"`).join(",")})`;
}
/** デバウンス（@ts-expect-error 不要の型安全版） */
function useDebouncedValue<T>(value: T, ms: number) {
  const [v, setV] = useState(value);

  // setTimeout の返り値に依存しない、型安全な書き方
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setV(value), ms);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [value, ms]);

  return v;
}

/** 検討リスト（DB）トグルボタン */
function FavButton({ hospitalId }: { hospitalId: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [active, setActive] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("student_favorites")
        .select("hospital_id")
        .eq("student_id", user.id)
        .eq("hospital_id", hospitalId)
        .maybeSingle();
      setActive(!!data);
    })();
  }, [hospitalId, supabase]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (active) {
        await supabase
          .from("student_favorites")
          .delete()
          .eq("student_id", user.id)
          .eq("hospital_id", hospitalId);
        setActive(false);
      } else {
        await supabase
          .from("student_favorites")
          .upsert({ student_id: user.id, hospital_id: hospitalId });
        setActive(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle}
      className={`px-3 py-1 text-sm rounded border ${active ? "bg-red-50 text-red-600 border-red-300" : ""}`}>
      {active ? "★ 検討中" : "☆ 検討に追加"}
    </button>
  );
}