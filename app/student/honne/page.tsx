"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Filter, Heart, DollarSign, Clock, Briefcase } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useDbFavorites } from "@/app/hooks/useDbFavorites";

/* =======================
   型（hospitals_honne）
======================= */
type HonneHospital = {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  city: string | null;
  facility_type: string | null;
  bed_count: number | null;
  residents_first_year: number | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;

  base_salary_annual: number | null;
  duty_allowance_annual: number | null;
  overtime_allowance_annual: number | null;
  other_allowance_annual: number | null;

  avg_overtime_hours_per_month: number | null;
  avg_duty_shifts_per_month: number | null;
  avg_total_work_hours_per_month: number | null;

  duty_pay_per_shift: number | null;

  good_tags: string[] | null;
  bad_tags: string[] | null;

  pr_highlights: string | null;
};

type WorkingStyle = "指定なし" | "ガッツリでもOK" | "ほどほど" | "QOL重視";
type TraineeRange = "指定なし" | "〜5人" | "6〜10人" | "11人〜";

/* ========= ユーティリティ ========= */

const MAX_INCOME_MAN = 1500; // 初年度年収バーの最大値（万円）

const formatMoneyMan = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "—" : `${v.toLocaleString("ja-JP")}万円`;

const computeTotalIncome = (h: HonneHospital): number | null => {
  const base = h.base_salary_annual ?? 0;
  const allowances =
    (h.duty_allowance_annual ?? 0) +
    (h.overtime_allowance_annual ?? 0) +
    (h.other_allowance_annual ?? 0);

  const total = base + allowances;
  if (total > 0) return total;

  // fallback: 旧カラム
  if (h.salary_1st_year_max != null) return h.salary_1st_year_max;
  if (h.salary_1st_year_min != null) return h.salary_1st_year_min;
  return null;
};

const computeHourlyWage = (h: HonneHospital): number | null => {
  const total = computeTotalIncome(h);
  if (!total) return null;

  const annualYen = total * 10_000;
  const overtime = h.avg_overtime_hours_per_month ?? 0;
  const dutyHoursApprox = (h.avg_duty_shifts_per_month ?? 0) * 8;
  const baseMonthHours = 160;
  const workMonth =
    h.avg_total_work_hours_per_month ??
    baseMonthHours + overtime + dutyHoursApprox;

  if (!workMonth || workMonth <= 0) return null;

  const annualHours = workMonth * 12;
  const hourly = Math.round(annualYen / annualHours);
  return hourly;
};

const formatTotalIncomePretty = (h: HonneHospital): string => {
  const total = computeTotalIncome(h);
  if (!total) return "—";
  return `${total.toLocaleString("ja-JP")}万円`;
};

/* =======================
   ページ本体
======================= */
export default function HonneSearchPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [hospitals, setHospitals] = useState<HonneHospital[]>([]);
  const [loading, setLoading] = useState(false);

  // フィルタ状態
  const [minIncome, setMinIncome] = useState(500); // 万円
  const [style, setStyle] = useState<WorkingStyle>("指定なし");
  const [traineeRange, setTraineeRange] = useState<TraineeRange>("指定なし");

  // 検討リスト連携
  const fav = useDbFavorites() as any;

  const toggleFavorite = async (hospitalId: string) => {
    try {
      if (typeof fav?.toggleFavorite === "function") {
        await fav.toggleFavorite(hospitalId);
      } else if (typeof fav?.toggle === "function") {
        await fav.toggle(hospitalId);
      } else if (typeof fav?.upsertDelete === "function") {
        await fav.upsertDelete(hospitalId);
      }
      if (typeof fav?.refresh === "function") await fav.refresh();
    } catch (e) {
      console.error("[honne] favorite toggle error", e);
      alert("検討リストの更新に失敗しました。時間をおいて再度お試しください。");
    }
  };

  const isFavorite = (hospitalId: string) => {
    if (typeof fav?.isFavorite === "function") return fav.isFavorite(hospitalId);
    if (typeof fav?.has === "function") return fav.has(hospitalId);
    if (Array.isArray(fav?.list)) {
      return fav.list.some((r: any) => r.hospital_id === hospitalId);
    }
    return false;
  };

  // データ読み込み
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("hospitals_honne")
          .select(
            "id,name,prefecture,region,city,facility_type,bed_count,residents_first_year,salary_1st_year_min,salary_1st_year_max,base_salary_annual,duty_allowance_annual,overtime_allowance_annual,other_allowance_annual,avg_overtime_hours_per_month,avg_duty_shifts_per_month,avg_total_work_hours_per_month,duty_pay_per_shift,good_tags,bad_tags,pr_highlights"
          )
          .limit(200);

        if (error) throw error;
        setHospitals((data ?? []) as HonneHospital[]);
      } catch (e: any) {
        console.error("[honne] load error", e?.message || e);
        alert(`検索に失敗しました：${e?.message ?? "unknown"}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // フィルタ適用
  const filtered = hospitals.filter((h) => {
    const total = computeTotalIncome(h);
    if (total == null || total < minIncome) return false;

    const ot = h.avg_overtime_hours_per_month ?? null;
    const duty = h.avg_duty_shifts_per_month ?? null;

    const styleOK = (() => {
      if (style === "指定なし") return true;
      if (ot == null && duty == null) return true;

      if (style === "ガッツリでもOK") {
        const otOk = ot == null || (ot >= 40 && ot <= 80);
        const dutyOk = duty == null || (duty >= 3 && duty <= 6);
        return otOk && dutyOk;
      }
      if (style === "ほどほど") {
        const otOk = ot == null || (ot >= 20 && ot <= 40);
        const dutyOk = duty == null || (duty >= 2 && duty <= 4);
        return otOk && dutyOk;
      }
      if (style === "QOL重視") {
        const otOk = ot == null || ot <= 20;
        const dutyOk = duty == null || duty <= 2;
        return otOk && dutyOk;
      }
      return true;
    })();

    if (!styleOK) return false;

    const trainees = h.residents_first_year ?? null;
    if (traineeRange === "〜5人") {
      if (trainees == null || trainees > 5) return false;
    } else if (traineeRange === "6〜10人") {
      if (trainees == null || trainees < 6 || trainees > 10) return false;
    } else if (traineeRange === "11人〜") {
      if (trainees == null || trainees < 11) return false;
    }

    return true;
  });

  const resultCount = filtered.length;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* ヘッダー */}
      <header className="space-y-2">
        <h1 className="text-xl md:text-2xl font-bold">「本音」で探す研修先</h1>
        <p className="text-sm text-gray-600">
          年収 × 働き方のバランスで、あなたにフィットする病院を見つけましょう。
        </p>
      </header>

      <div className="grid md:grid-cols-[320px_1fr] gap-4 md:gap-8">
        {/* 左カラム：条件設定 */}
        <aside className="rounded-2xl bg-white border border-slate-100 p-4 space-y-6 shadow-sm">
          {/* 年収スライダー */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                最低希望年収
              </span>
              <span className="text-sm font-bold text-primary-700">
                {minIncome.toLocaleString("ja-JP")}万円
              </span>
            </div>
            <input
              type="range"
              min={300}
              max={1200}
              step={50}
              value={minIncome}
              onChange={(e) => setMinIncome(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>300万円</span>
              <span>1,200万円+</span>
            </div>
          </section>

          {/* 働き方スタイル */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              働き方スタイル
            </p>
            <div className="flex flex-col gap-1 text-xs">
              {(["指定なし", "ガッツリでもOK", "ほどほど", "QOL重視"] as WorkingStyle[]).map(
                (s) => (
                  <label
                    key={s}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                      style === s ? "bg-primary-50 text-primary-700" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      className="accent-primary-500"
                      checked={style === s}
                      onChange={() => setStyle(s)}
                    />
                    <span>{s}</span>
                  </label>
                )
              )}
            </div>
          </section>

          {/* 研修医生数 */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              研修医（1年目）の人数
            </p>
            <div className="flex flex-col gap-1 text-xs">
              {(["指定なし", "〜5人", "6〜10人", "11人〜"] as TraineeRange[]).map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                    traineeRange === r ? "bg-primary-50 text-primary-700" : "hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    className="accent-primary-500"
                    checked={traineeRange === r}
                    onChange={() => setTraineeRange(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 条件リセット */}
          <section className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMinIncome(500);
                setStyle("指定なし");
                setTraineeRange("指定なし");
              }}
              className="w-full text-xs text-gray-600 border rounded py-2 hover:bg-slate-50"
            >
              条件をリセット
            </button>
          </section>
        </aside>

        {/* 右カラム：結果一覧 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading
                ? "検索中…"
                : `該当する病院：${resultCount}件（年収・働き方のバランスで絞り込み済み）`}
            </p>
            <Link
              href="/student/browse"
              className="flex items-center gap-1 text-xs text-primary-700 hover:underline"
            >
              <Filter className="w-3 h-3" />
              通常の条件検索に戻る
            </Link>
          </div>

          {filtered.map((h) => {
            const totalIncome = computeTotalIncome(h);

            const base = h.base_salary_annual ?? null;
            const bonus = h.other_allowance_annual ?? null;
            const duty = h.duty_allowance_annual ?? null;
            const overtime = h.overtime_allowance_annual ?? null;
            const allowanceSum = (duty ?? 0) + (overtime ?? 0);

            const hourly = computeHourlyWage(h);
            const ot = h.avg_overtime_hours_per_month ?? null;
            const dutyCount = h.avg_duty_shifts_per_month ?? null;
            const workHours = h.avg_total_work_hours_per_month ?? null;

            // バーの幅（総長さ）: totalIncome / MAX_INCOME_MAN
            const totalRatio =
              totalIncome && totalIncome > 0
                ? Math.min(totalIncome / MAX_INCOME_MAN, 1)
                : 0;

            const basePart = base ?? 0;
            const bonusPart = bonus ?? 0;
            const dutyOvertimePart = allowanceSum;

            const partsTotal = basePart + bonusPart + dutyOvertimePart || 1;
            const baseRatioInner = basePart / partsTotal;
            const bonusRatioInner = bonusPart / partsTotal;
            const dutyOvertimeRatioInner = dutyOvertimePart / partsTotal;

            const goodTags = h.good_tags ?? [];
            const badTags = h.bad_tags ?? [];

            const favActive = isFavorite(h.id);

            return (
              <div
                key={h.id}
                className="rounded-2xl bg-white border border-slate-100 p-4 md:p-5 flex flex-col gap-3 shadow-sm"
              >
                {/* 上段：病院情報＋アクション */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base md:text-lg font-semibold text-slate-900">
                        {h.name}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600">
                      {h.prefecture ?? "—"}・{h.region ?? "エリア未設定"}・
                      {h.city ?? ""}
                      {h.facility_type ? `／${h.facility_type}` : ""}
                    </p>

                    {/* タグ */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {goodTags.slice(0, 4).map((t) => (
                        <span
                          key={`good-${t}`}
                          className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] text-blue-700"
                        >
                          {t}
                        </span>
                      ))}
                      {badTags.slice(0, 3).map((t) => (
                        <span
                          key={`bad-${t}`}
                          className="px-2 py-0.5 rounded-full bg-red-50 text-[10px] text-red-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* PRハイライト（軽く） */}
                    {h.pr_highlights && (
                      <p className="mt-1 text-xs text-slate-700 line-clamp-2">
                        {h.pr_highlights}
                      </p>
                    )}
                  </div>

                  {/* 右上：年収 & アクション */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">初年度年収（目安）</p>
                      <p className="text-lg md:text-xl font-bold text-primary-700">
                        {formatTotalIncomePretty(h)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ベース：{formatMoneyMan(h.base_salary_annual)} / 賞与・その他：
                        {formatMoneyMan(bonus)} / 手当（当直・残業）：
                        {formatMoneyMan(allowanceSum || null)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        1回当直手当：
                        {h.duty_pay_per_shift != null
                          ? `${h.duty_pay_per_shift.toLocaleString("ja-JP")}円`
                          : "—"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/student/hospitals/${encodeURIComponent(h.id)}`}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        詳細を見る
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(h.id)}
                        className={`px-3 py-1.5 rounded text-xs border flex items-center gap-1 ${
                          favActive
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Heart
                          className="w-3 h-3"
                          fill={favActive ? "#ef4444" : "none"}
                          color={favActive ? "#ef4444" : "#64748b"}
                        />
                        {favActive ? "検討中" : "検討リストに追加"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 年収バー（絶対値の長さ + 内訳3色） */}
                <div className="mt-2 space-y-1">
                  <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 flex"
                      style={{ width: `${totalRatio * 100}%` }}
                    >
                      {/* ベース */}
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${baseRatioInner * 100}%` }}
                      />
                      {/* 手当（当直+残業） */}
                      <div
                        className="h-full bg-blue-400"
                        style={{ width: `${dutyOvertimeRatioInner * 100}%` }}
                      />
                      {/* 賞与・その他 */}
                      <div
                        className="h-full bg-sky-200"
                        style={{ width: `${bonusRatioInner * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        ベース
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        当直＋残業
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-200" />
                        賞与・その他
                      </span>
                    </div>
                    <span>MAX: {MAX_INCOME_MAN.toLocaleString("ja-JP")}万円</span>
                  </div>
                </div>

                {/* 数字サマリ：ミニカード4枚 */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStatCard
                    label="月平均労働時間"
                    value={
                      workHours != null
                        ? `${workHours.toLocaleString("ja-JP")}h`
                        : "—"
                    }
                  />
                  <MiniStatCard
                    label="月平均残業"
                    value={ot != null ? `${ot.toLocaleString("ja-JP")}h` : "—"}
                  />
                  <MiniStatCard
                    label="月当直回数"
                    value={
                      dutyCount != null ? `${dutyCount.toLocaleString("ja-JP")}回` : "—"
                    }
                  />
                  <MiniStatCard
                    label="推定時給"
                    value={
                      hourly != null
                        ? `${hourly.toLocaleString("ja-JP")}円/h`
                        : "—"
                    }
                  />
                </div>
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="p-10 text-center text-gray-500 border rounded-2xl bg-gray-50">
              条件に合致する病院が見つかりませんでした。条件を緩めて再検索してみてください。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ========= 小さな部品 ========= */

function MiniStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 flex flex-col justify-between h-[64px]">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800 mt-1">{value}</span>
    </div>
  );
}