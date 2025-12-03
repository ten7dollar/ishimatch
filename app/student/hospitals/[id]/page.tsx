"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Heart, Clock, DollarSign } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useDbFavorites } from "@/app/hooks/useDbFavorites";

/* ---------- 年収表示の共通フォーマット ---------- */
const formatSalary = (max: number | null, min?: number | null) => {
  if (max == null && (min == null || Number.isNaN(min))) {
    return "—";
  }

  if (min != null && !Number.isNaN(min) && max != null && !Number.isNaN(max)) {
    if (min !== max) {
      const minStr = min.toLocaleString("ja-JP");
      const maxStr = max.toLocaleString("ja-JP");
      return `${minStr}〜${maxStr}万円 / 年`;
    }
    const v = max.toLocaleString("ja-JP");
    return `${v}万円 / 年`;
  }

  if (max != null && !Number.isNaN(max)) {
    const v = max.toLocaleString("ja-JP");
    return `${v}万円 / 年`;
  }

  if (min != null && !Number.isNaN(min)) {
    const v = min.toLocaleString("ja-JP");
    return `${v}万円 / 年`;
  }

  return "—";
};

/* ---------- 型（public.hospitals_resolved） ---------- */
type HospitalRow = {
  id: string;
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
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  duty_frequency: "~2回" | "3~4回" | "5回以上" | "特になし" | null;
  pr_highlights: string | null;
};

/* ---------- 型（hospitals_honne） ---------- */
type HonneRow = {
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
};

const formatMan = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "—" : `${v.toLocaleString("ja-JP")}万円`;

const computeTotalIncome = (h: HonneRow | null, row: HospitalRow | null): number | null => {
  if (h) {
    const base = h.base_salary_annual ?? 0;
    const allowances =
      (h.duty_allowance_annual ?? 0) +
      (h.overtime_allowance_annual ?? 0) +
      (h.other_allowance_annual ?? 0);
    const total = base + allowances;
    if (total > 0) return total;
  }
  if (row?.salary_1st_year_max != null) return row.salary_1st_year_max;
  if (row?.salary_1st_year_min != null) return row.salary_1st_year_min;
  return null;
};

const computeHourlyWage = (h: HonneRow | null, row: HospitalRow | null): number | null => {
  const total = computeTotalIncome(h, row);
  if (!total) return null;

  const annualYen = total * 10_000;
  const overtime = h?.avg_overtime_hours_per_month ?? 0;
  const dutyHoursApprox = (h?.avg_duty_shifts_per_month ?? 0) * 8;
  const baseMonthHours = 160;
  const workMonth =
    h?.avg_total_work_hours_per_month ??
    baseMonthHours + overtime + dutyHoursApprox;

  if (!workMonth || workMonth <= 0) return null;

  const annualHours = workMonth * 12;
  const hourly = Math.round(annualYen / annualHours);
  return hourly;
};

export default function StudentHospitalDetail() {
  const params = useParams();
  const hospitalId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [row, setRow] = useState<HospitalRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState<boolean>(true); // PR公開フラグ

  const [honne, setHonne] = useState<HonneRow | null>(null);

  // 病院基本情報（hospitals_resolved）を取得
  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("hospitals_resolved")
        .select(
          "id,name,name_kana,prefecture,region,city,address,website_url,facility_type,bed_count,residents_first_year,salary_1st_year_min,salary_1st_year_max,duty_frequency,pr_highlights"
        )
        .eq("id", hospitalId)
        .maybeSingle();

      if (!error) setRow((data as HospitalRow) ?? null);
      setLoading(false);
    })();
  }, [hospitalId, supabase]);

  // 本音検索用情報（hospitals_honne）を取得
  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      try {
        const { data, error } = await supabase
          .from("hospitals_honne")
          .select(
            "base_salary_annual,duty_allowance_annual,overtime_allowance_annual,other_allowance_annual,avg_overtime_hours_per_month,avg_duty_shifts_per_month,avg_total_work_hours_per_month,duty_pay_per_shift,good_tags,bad_tags"
          )
          .eq("id", hospitalId)
          .maybeSingle();

        if (!error) {
          setHonne((data as HonneRow) ?? null);
        }
      } catch (e) {
        console.error("[student/hospitals/[id]] honne fetch error", e);
      }
    })();
  }, [hospitalId, supabase]);

  // PR公開フラグ + HERO画像URL を API から取得
  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/hospitals/hero?hospitalId=${encodeURIComponent(hospitalId)}`,
          { method: "GET", cache: "no-store" }
        );
        if (!res.ok) {
          console.warn("[student/hospitals/[id]] /api/hospitals/hero status", res.status);
          setHeroUrl(null);
          setIsPublished(true);
          return;
        }
        const json = (await res.json()) as { url: string | null; isPublished?: boolean };
        setHeroUrl(json.url || null);
        setIsPublished(json.isPublished ?? true);
      } catch (e) {
        console.error("[student/hospitals/[id]] hero fetch error", e);
        setHeroUrl(null);
        setIsPublished(true);
      }
    })();
  }, [hospitalId]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6">
        <p className="text-gray-600">読込中…</p>
      </main>
    );
  }
  if (!row) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6">
        <p className="text-gray-600">該当の病院が見つかりませんでした。</p>
      </main>
    );
  }

  const hasHero = !!heroUrl;

  const totalIncome = computeTotalIncome(honne, row);
  const hourly = computeHourlyWage(honne, row);
  const ot = honne?.avg_overtime_hours_per_month ?? null;
  const duty = honne?.avg_duty_shifts_per_month ?? null;
  const workHours = honne?.avg_total_work_hours_per_month ?? null;
  const dutyPay = honne?.duty_pay_per_shift ?? null;
  const goodTags = honne?.good_tags ?? [];
  const badTags = honne?.bad_tags ?? [];

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-10">
      {/* Hero + 本音サマリ */}
      <section className="rounded-2xl overflow-hidden border bg-white shadow-sm">
        <div className="md:flex">
          {hasHero && (
            <div className="md:w-1/2 w-full h-48 md:h-64 overflow-hidden bg-gray-100">
              <img
                src={heroUrl!}
                alt={row.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className={hasHero ? "md:w-1/2 w-full p-6 space-y-4" : "w-full p-6 space-y-4"}>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold text-primary-700">{row.name}</h1>
              <p className="text-sm text-text-muted">
                {`${row.prefecture ?? "—"}・${row.city ?? "—"}（${row.region ?? "—"}）`}
                {row.facility_type ? `／${row.facility_type}` : ""}
              </p>

              {!isPublished && (
                <div className="mt-3 inline-flex flex-col gap-1 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700 border border-orange-200">
                  <span>
                    この病院の詳細情報は現在、病院側の設定により非公開になっています。
                  </span>
                  <span>
                    他の病院も見てみましょう：
                    <Link
                      href="/student/browse"
                      className="ml-1 underline text-orange-700 hover:text-orange-800"
                    >
                      病院を探す
                    </Link>
                  </span>
                </div>
              )}
            </div>

            {/* 本音系サマリ */}
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <div>
                <p className="text-[11px] text-slate-500">初年度年収（目安）</p>
                <p className="text-lg font-bold text-primary-700">
                  {totalIncome != null
                    ? `${totalIncome.toLocaleString("ja-JP")}万円`
                    : "—"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  ベース：{formatMan(honne?.base_salary_annual)}／手当合計：
                  {formatMan(
                    (honne?.duty_allowance_annual ?? 0) +
                      (honne?.overtime_allowance_annual ?? 0) +
                      (honne?.other_allowance_annual ?? 0)
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  1回当直手当：
                  {dutyPay != null
                    ? `${dutyPay.toLocaleString("ja-JP")}円`
                    : "—"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-1">
                <MiniStat
                  icon="clock"
                  label="月平均残業"
                  value={
                    ot != null ? `${ot.toLocaleString("ja-JP")}h` : "—"
                  }
                />
                <MiniStat
                  icon="moon"
                  label="月当直回数"
                  value={
                    duty != null ? `${duty.toLocaleString("ja-JP")}回` : "—"
                  }
                />
                <MiniStat
                  icon="money"
                  label="推定時給"
                  value={
                    hourly != null
                      ? `${hourly.toLocaleString("ja-JP")}円/h`
                      : "—"
                  }
                />
              </div>
            </div>

            {/* タグ */}
            {(goodTags.length > 0 || badTags.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {goodTags.map((t) => (
                  <span
                    key={`good-${t}`}
                    className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] text-blue-700"
                  >
                    {t}
                  </span>
                ))}
                {badTags.map((t) => (
                  <span
                    key={`bad-${t}`}
                    className="px-2 py-0.5 rounded-full bg-red-50 text-[10px] text-red-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* アクションボタン行（既存と同じ） */}
            <div className="flex gap-2 justify-end pt-2">
              {row.website_url && (
                <a
                  href={row.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                >
                  公式サイト
                </a>
              )}
              <Link
                href="/student/saved"
                className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
              >
                検討リストを開く
              </Link>
              <FavButton hospitalId={row.id} />
            </div>
          </div>
        </div>
      </section>

      {/* 概要（公開/非公開に関係なく表示） */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <p>
            <span className="text-text-muted">所在地：</span>
            {row.address
              ? row.address
              : `${row.prefecture ?? ""}${row.city ? "・" + row.city : ""}` || "—"}
          </p>
          <p>
            <span className="text-text-muted">救急区分：</span>
            {row.facility_type ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">病床数：</span>
            {row.bed_count ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">研修医数（1年目）：</span>
            {row.residents_first_year ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">当直回数：</span>
            {row.duty_frequency ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">年収：</span>
            {formatSalary(row.salary_1st_year_max, row.salary_1st_year_min)}
          </p>
        </div>
      </section>

      {/* PR ハイライト：公開のときだけ表示 */}
      {isPublished && row.pr_highlights && (
        <section className="card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-primary-700">PRハイライト</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {row.pr_highlights}
          </p>
        </section>
      )}

      {/* アクション（応募） */}
      {isPublished ? (
        <div className="flex gap-3 justify-end">
          <Link
            href={`/student/apply?hospitalId=${encodeURIComponent(row.id)}`}
            className="bg-primary-500 text-white rounded-md px-4 py-2 text-sm hover:bg-primary-600 transition"
          >
            初回面談を申し込む
          </Link>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            disabled
            className="rounded-md px-4 py-2 text-sm border border-gray-300 text-gray-400 cursor-not-allowed"
            title="現在この病院への申込みは停止中です"
          >
            現在この病院への申込みは停止中です
          </button>
        </div>
      )}
    </main>
  );
}

/* ===== ミニ統計カード ===== */
function MiniStat({
  icon,
  label,
  value,
}: {
  icon: "clock" | "moon" | "money";
  label: string;
  value: string;
}) {
  const Icon =
    icon === "money" ? DollarSign : icon === "clock" ? Clock : Clock; // ※アイコン使い分けたければ増やせる

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 flex flex-col justify-between h-[54px]">
      <span className="text-[10px] text-slate-500 flex items-center gap-1">
        <Icon className="w-3 h-3 text-slate-400" />
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800 mt-1">{value}</span>
    </div>
  );
}

/* =========================================================
   検討リストトグル（DB）
========================================================= */
function FavButton({ hospitalId }: { hospitalId: string }) {
  const fav = useDbFavorites() as {
    list: Array<{ hospital_id: string }>;
    isFavorite?: (id: string) => boolean;
    has?: (id: string) => boolean;
    toggleFavorite?: (id: string) => Promise<void>;
    toggle?: (id: string) => Promise<void>;
    upsertDelete?: (id: string) => Promise<void>;
    refresh?: () => Promise<void>;
  };

  const safeHas = (id: string) =>
    (typeof fav?.isFavorite === "function" && fav.isFavorite(id)) ||
    (typeof fav?.has === "function" && fav.has(id)) ||
    (Array.isArray(fav?.list) && fav.list.some((r) => r.hospital_id === id)) ||
    false;

  const [active, setActive] = useState<boolean>(safeHas(hospitalId));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActive(safeHas(hospitalId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fav?.list, hospitalId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setActive((prev) => !prev);
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
      setActive((prev) => !prev);
      console.error("[favorite] toggle error", e);
      alert("検討リストの更新に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label="検討に追加"
      className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 transition-colors ${
        active
          ? "bg-red-50 text-red-600 border-red-300"
          : "hover:bg-gray-50 text-gray-700 border-gray-300"
      } ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
      title={active ? "検討中（クリックで外す）" : "検討に追加"}
    >
      <Heart
        className="w-4 h-4"
        color={active ? "#ef4444" : "#666"}
        fill={active ? "#ef4444" : "transparent"}
      />
      {active ? "検討中" : "検討に追加"}
    </button>
  );
}