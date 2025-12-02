"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, Heart, MessageCircle, TrendingUp } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useFavoriteHospitals } from "../_providers/favorite-hospitals";

/* ---------- 型（Ranking / おすすめ） ---------- */
type HospitalRow = {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  pr_highlights: string | null;
};

type HeroMap = Record<string, string | null>;

const formatSalary = (max: number | null, min?: number | null) => {
  // min / max ともに数値じゃない場合
  if (max == null && (min == null || Number.isNaN(min))) {
    return "—";
  }

  // min と max 両方ある場合
  if (min != null && !Number.isNaN(min) && max != null && !Number.isNaN(max)) {
    // 幅があるときだけレンジ表示
    if (min !== max) {
      const minStr = min.toLocaleString("ja-JP");
      const maxStr = max.toLocaleString("ja-JP");
      return `${minStr}〜${maxStr}万円 / 年`;
    }
    // 同じなら単一表示
    const v = max.toLocaleString("ja-JP");
    return `${v}万円 / 年`;
  }

  // max だけ分かる場合
  if (max != null && !Number.isNaN(max)) {
    const v = max.toLocaleString("ja-JP");
    return `${v}万円 / 年`;
  }

  // min だけ分かる場合（保険）
  if (min != null && !Number.isNaN(min)) {
    const v = min.toLocaleString("ja-JP");
    return `${v}万円 / 年`;
  }

  return "—";
};

const truncate = (text: string, max: number) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
};

// レーダーチャート用の簡易ダミーデータ（後でDB値に差し替え予定）
const radarData = [
  { subject: "給与", A: 4 },
  { subject: "手技", A: 5 },
  { subject: "教育", A: 3 },
  { subject: "症例数", A: 4 },
  { subject: "当直", A: 2 },
];

export default function StudentDashboard() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  /* ========== KPI ========== */

  const { count: favoritesCount } = useFavoriteHospitals();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUnreadCount(0);
        return;
      }
      const { data, error } = await supabase
        .from("scout_invitations")
        .select("id,read_at")
        .eq("student_id", user.id);

      if (error) {
        console.error("[dashboard] unread scouts fetch error:", error.message);
        return;
      }

      const rows = (data ?? []) as { id: string; read_at: string | null }[];
      const unread = rows.filter((r) => !r.read_at).length;
      setUnreadCount(unread);
    } catch (e: any) {
      console.error("[dashboard] unread scouts unexpected error:", e?.message || e);
    }
  };

  useEffect(() => {
    refreshUnread();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      ch = supabase
        .channel(`student-scouts:dashboard:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "scout_invitations",
            filter: `student_id=eq.${user.id}`,
          },
          () => refreshUnread()
        )
        .subscribe();
    })();
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========== 初年度年収ランキング ========== */

  const [ranking, setRanking] = useState<HospitalRow[]>([]);
  const [rankingHeroMap, setRankingHeroMap] = useState<HeroMap>({});
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setRankingLoading(true);
      try {
        const { data, error } = await supabase
          .from("hospitals_resolved")
          .select(
            "id,name,prefecture,region,salary_1st_year_min,salary_1st_year_max,pr_highlights"
          )
          .not("salary_1st_year_max", "is", null)
          .order("salary_1st_year_max", { ascending: false })
          .limit(3);

        if (error) {
          console.error("[dashboard] ranking fetch error", error);
          setRanking([]);
        } else {
          setRanking((data ?? []) as HospitalRow[]);
        }
      } catch (e) {
        console.error("[dashboard] ranking unexpected error", e);
        setRanking([]);
      } finally {
        setRankingLoading(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    if (!ranking.length) {
      setRankingHeroMap({});
      return;
    }

    (async () => {
      try {
        const entries = await Promise.all(
          ranking.map(async (h) => {
            try {
              const res = await fetch(
                `/api/hospitals/hero?hospitalId=${encodeURIComponent(h.id)}`,
                { method: "GET", cache: "no-store" }
              );
              if (!res.ok) return [h.id, null] as const;
              const json = (await res.json()) as { url: string | null };
              return [h.id, json.url || null] as const;
            } catch {
              return [h.id, null] as const;
            }
          })
        );

        const next: HeroMap = {};
        for (const [id, url] of entries) next[id] = url;
        setRankingHeroMap(next);
      } catch (e) {
        console.error("[dashboard] ranking hero fetch error", e);
      }
    })();
  }, [ranking]);

  /* ========== あなたへのおすすめ（HEROあり & 公開中からランダム3件） ========== */

  const [recommended, setRecommended] = useState<HospitalRow[]>([]);
  const [recommendedHeroMap, setRecommendedHeroMap] = useState<HeroMap>({});

  useEffect(() => {
    (async () => {
      try {
        // 1) HERO画像が設定されていて、かつ PR 公開中の病院アカウントを取得
        const { data: accRows, error: accErr } = await supabase
          .from("hospital_accounts")
          .select("hospital_id")
          .not("hero_image_path", "is", null)
          .eq("is_published", true);

        if (accErr) {
          console.error("[dashboard] recommended accounts fetch error", accErr);
          setRecommended([]);
          return;
        }

        const ids = (accRows ?? [])
          .map((r: any) => r.hospital_id as string | null)
          .filter((id): id is string => !!id);

        if (!ids.length) {
          setRecommended([]);
          return;
        }

        // 2) hospitals_resolved から候補病院の情報取得
        const { data: hospRows, error: hospErr } = await supabase
          .from("hospitals_resolved")
          .select(
            "id,name,prefecture,region,salary_1st_year_min,salary_1st_year_max,pr_highlights"
          )
          .in("id", ids);

        if (hospErr) {
          console.error("[dashboard] recommended hospitals fetch error", hospErr);
          setRecommended([]);
          return;
        }

        const list = (hospRows ?? []) as HospitalRow[];
        if (!list.length) {
          setRecommended([]);
          return;
        }

        // 3) シャッフルして上位3件をおすすめに
        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setRecommended(shuffled.slice(0, 3));
      } catch (e) {
        console.error("[dashboard] recommended unexpected error", e);
        setRecommended([]);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    if (!recommended.length) {
      setRecommendedHeroMap({});
      return;
    }

    (async () => {
      try {
        const entries = await Promise.all(
          recommended.map(async (h) => {
            try {
              const res = await fetch(
                `/api/hospitals/hero?hospitalId=${encodeURIComponent(h.id)}`,
                { method: "GET", cache: "no-store" }
              );
              if (!res.ok) return [h.id, null] as const;
              const json = (await res.json()) as { url: string | null };
              return [h.id, json.url || null] as const;
            } catch {
              return [h.id, null] as const;
            }
          })
        );

        const next: HeroMap = {};
        for (const [id, url] of entries) next[id] = url;
        setRecommendedHeroMap(next);
      } catch (e) {
        console.error("[dashboard] recommended hero fetch error", e);
      }
    })();
  }, [recommended]);

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-10">
      {/* ヘッダー：タイトル + KPI（右上） */}
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-sm md:text-base text-text-muted mt-1">
            あなたに最適な研修病院を見つけましょう
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:min-w-[340px]">
          <Link
            href="/student/saved"
            className="rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">検討リスト</p>
              <Heart className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-3xl font-bold text-primary-600 mt-2">{favoritesCount}</p>
          </Link>

          <Link
            href="/student/scouts"
            className="rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">未読スカウト</p>
              <MessageCircle className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-3xl font-bold text-primary-600 mt-2">{unreadCount}</p>
          </Link>
        </div>
      </header>

      {/* 検索導線：本音検索 / 通常検索 */}
      <section className="grid md:grid-cols-2 gap-4 pt-2">
        {/* 本音検索 */}
        <Link
          href="/student/honne"
          className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-sky-50 to-slate-50 hover:bg-primary-50/80 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3 px-5 py-4">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <Filter className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-primary-800">
                  本音検索
                </h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-orange-100 text-orange-700 font-semibold">
                  新機能
                </span>
              </div>
              <p className="text-xs md:text-sm text-text-muted">
                年収と働き方のバランスから、リアルな“コスパ”で研修先を比較できます。
              </p>
              <p className="text-[11px] md:text-xs text-primary-700 flex items-center gap-1 group-hover:underline">
                <ArrowRight className="w-4 h-4" />
                本音で病院を探してみる
              </p>
            </div>
          </div>
        </Link>

        {/* 通常検索 */}
        <Link
          href="/student/browse"
          className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3 px-5 py-4">
            <div className="p-2 rounded-full bg-slate-50">
              <Filter className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  通常検索
                </h2>
              </div>
              <p className="text-xs md:text-sm text-text-muted">
                都道府県・救急区分・年収帯・当直回数など、条件を指定して病院を検索します。
              </p>
              <p className="text-[11px] md:text-xs text-primary-700 flex items-center gap-1 group-hover:underline">
                <ArrowRight className="w-4 h-4" />
                条件を指定して探す
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* 初年度年収ランキング */}
      <section className="space-y-4 pt-4 pb-6 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-primary-800">初年度年収ランキング</h2>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-full">
            {rankingLoading && ranking.length === 0 && (
              <p className="text-sm text-text-muted px-1">読み込み中…</p>
            )}

            {!rankingLoading && ranking.length === 0 && (
              <p className="text-sm text-text-muted px-1">
                ランキングを表示できる病院データがまだありません。
              </p>
            )}

            {ranking.map((h, idx) => {
              const hero = rankingHeroMap[h.id] || "/images/hero-hospital.jpg";
              const salaryText = formatSalary(
                h.salary_1st_year_max,
                h.salary_1st_year_min
              );
              const pr = truncate(
                h.pr_highlights ?? "PR情報は準備中です。",
                50
              );

              const badgeGradient =
                idx === 0
                  ? "from-amber-400 via-yellow-300 to-amber-500"
                  : idx === 1
                  ? "from-slate-300 via-gray-200 to-slate-400"
                  : "from-orange-500 via-amber-400 to-orange-600";

              const rankLabel = `${idx + 1}位`;

              return (
                <Link
                  key={h.id}
                  href={`/student/hospitals/${h.id}`}
                  className="min-w-[260px] max-w-[320px] flex-shrink-0"
                >
                  <div className="rounded-2xl bg-white flex flex-col h-full">
                    {/* ランクバッジ */}
                    <div className="px-4 pt-3 flex justify-between items-center">
                      <span
                        className={`inline-flex items-center justify-center text-[11px] px-6 py-1 rounded-full text-slate-900 font-semibold bg-gradient-to-r ${badgeGradient}`}
                      >
                        {rankLabel}
                      </span>
                    </div>

                    {/* 画像 */}
                    <div className="w-full h-32 mt-2 overflow-hidden">
                      {rankingHeroMap[h.id] ? (
                        <img
                          src={hero}
                          alt={h.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={hero}
                          alt={h.name}
                          width={400}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* コンテンツ */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 w-fit">
                        {h.prefecture ?? "—"}・初期
                      </span>
                      <p className="text-sm font-semibold text-primary-800 line-clamp-2">
                        {h.name}
                      </p>
                      <p className="text-lg font-bold text-primary-800">{salaryText}</p>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                        {pr}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* あなたへのおすすめ（HEROあり & 公開中の中からランダム3件） */}
      <section className="space-y-4 pt-4 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-primary-800">あなたへのおすすめ</h2>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-full">
            {recommended.length === 0 ? (
              <p className="text-sm text-text-muted px-1">
                おすすめを表示できる病院データがまだありません。
              </p>
            ) : (
              recommended.map((h) => {
                const hero =
                  recommendedHeroMap[h.id] || "/images/hero-hospital.jpg";
                const salaryText = formatSalary(
                  h.salary_1st_year_max,
                  h.salary_1st_year_min
                );
                const pr = truncate(
                  h.pr_highlights ?? "あなたの条件に近い病院です。",
                  60
                );

                return (
                  <Link
                    key={h.id}
                    href={`/student/hospitals/${h.id}`}
                    className="min-w-[260px] max-w-[320px] flex-shrink-0"
                  >
                    <div className="rounded-2xl bg-white flex flex-col h-full border border-blue-100 hover:bg白 hover:shadow-[0_10px_25px_rgba(15,23,42,0.1)] transition">
                      {/* 画像 */}
                      <div className="w-full h-24 mt-2 rounded-t-2xl overflow-hidden">
                        {recommendedHeroMap[h.id] ? (
                          <img
                            src={hero}
                            alt={h.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={hero}
                            alt={h.name}
                            width={400}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* コンテンツ */}
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-primary-800 line-clamp-2">
                              {h.name}
                            </h3>
                            <p className="text-xs text-text-muted">
                              {h.prefecture ?? "—"}・{h.region ?? "エリア未設定"}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary-50 text-primary-700">
                            おすすめ
                          </span>
                        </div>

                        <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                          <span className="font-semibold text-primary-800">
                            {salaryText}
                          </span>
                          <span className="ml-1">{pr}</span>
                        </p>

                        {/* グラフ：カード下部中央に寄せる */}
                        <div className="mt-3 flex justify-center">
                          <div className="w-20 h-20 md:w-24 md:h-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart
                                cx="50%"
                                cy="50%"
                                outerRadius="70%"
                                data={radarData}
                              >
                                <PolarGrid />
                                <PolarAngleAxis
                                  dataKey="subject"
                                  tick={{ fontSize: 9 }}
                                />
                                <Radar
                                  name="スコア"
                                  dataKey="A"
                                  stroke="#0077B6"
                                  fill="#0077B6"
                                  fillOpacity={0.3}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}