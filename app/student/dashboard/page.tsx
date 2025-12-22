"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, Heart, MessageCircle, TrendingUp } from "lucide-react";

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

export default function StudentDashboard() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // ★ β版フラグ：面談申込みは停止
  const BETA_APPLY_DISABLED = true;

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
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:space-y-10 space-y-6">
      {/* ヘッダー：タイトル + KPI（右上） */}
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-sm md:text-base text-text-muted mt-1">
            あなたに最適な研修病院を見つけましょう
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:min-w-[340px]">
          <Link
            href="/student/saved"
            className="rounded-2xl border border-blue-100 bg-white px-4 py-4 md:px-6 md:py-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">検討リスト</p>
              <Heart className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-primary-600 mt-2">
              {favoritesCount}
            </p>
          </Link>

          <Link
            href="/student/scouts"
            className="rounded-2xl border border-blue-100 bg-white px-4 py-4 md:px-6 md:py-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">未読スカウト</p>
              <MessageCircle className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-primary-600 mt-2">
              {unreadCount}
            </p>
          </Link>
        </div>
      </header>

      {/* ★ β告知（面談申込み停止） */}
      {BETA_APPLY_DISABLED && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm md:text-base font-semibold text-amber-900">
                β版のため、現在は面談申し込み受付停止中です
              </p>
              <p className="text-xs md:text-sm text-amber-800">
                病院の情報収集・本音検索・検討リスト作成をご利用ください（申込機能は準備でき次第公開します）。
              </p>
            </div>
            <Link
              href="/student/contact"
              className="shrink-0 px-3 py-1.5 rounded bg-white border text-xs md:text-sm hover:bg-amber-100 transition"
            >
              問い合わせ
            </Link>
          </div>
        </section>
      )}

      {/* 検索導線：本音検索 / 通常検索 */}
      <section className="grid md:grid-cols-2 gap-4 pt-2">
        <Link
          href="/student/honne"
          className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-sky-50 to-slate-50 hover:bg-primary-50/80 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3 px-4 py-3 md:px-5 md:py-4">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <Filter className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-primary-800">
                  本音検索
                </h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-orange-100 text-orange-700 font-semibold">
                  新機能
                </span>
              </div>
              <p className="text-[11px] md:text-sm text-text-muted">
                年収と働き方のバランスから、リアルな“コスパ”で研修先を比較できます。
              </p>
              <p className="text-[11px] md:text-xs text-primary-700 flex items-center gap-1 group-hover:underline">
                <ArrowRight className="w-4 h-4" />
                本音で病院を探してみる
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/student/browse"
          className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3 px-4 py-3 md:px-5 md:py-4">
            <div className="p-2 rounded-full bg-slate-50">
              <Filter className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  通常検索
                </h2>
              </div>
              <p className="text-[11px] md:text-sm text-text-muted">
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

      {/* 初年度年収ランキング：スマホは縦並び、PCは3列 */}
      <section className="space-y-4 md:pt-4 md:pb-6 pt-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-primary-800">初年度年収ランキング</h2>
        </div>

        {rankingLoading && ranking.length === 0 && (
          <p className="text-sm text-text-muted">読み込み中…</p>
        )}

        {!rankingLoading && ranking.length === 0 && (
          <p className="text-sm text-text-muted">
            ランキングを表示できる病院データがまだありません。
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ranking.map((h, idx) => {
            const hero = rankingHeroMap[h.id] || "/images/hero-hospital.jpg";
            const salaryText = formatSalary(h.salary_1st_year_max, h.salary_1st_year_min);
            const pr = truncate(h.pr_highlights ?? "PR情報は準備中です。", 70);

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
                className="rounded-2xl bg-white border border-slate-100 hover:shadow-sm transition overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between">
                  <span className={`inline-flex items-center justify-center text-[11px] px-5 py-1 rounded-full text-slate-900 font-semibold bg-gradient-to-r ${badgeGradient}`}>
                    {rankLabel}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {h.prefecture ?? "—"}・初期
                  </span>
                </div>

                {/* 画像：スマホで横に引っ張られないように固定高さ */}
                <div className="w-full h-40 md:h-32 bg-slate-100 overflow-hidden">
                  {rankingHeroMap[h.id] ? (
                    <img src={hero} alt={h.name} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={hero} alt={h.name} width={800} height={400} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-primary-800 line-clamp-2">{h.name}</p>
                  <p className="text-lg font-bold text-primary-800">{salaryText}</p>
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-3">{pr}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* あなたへのおすすめ：スマホは縦並び、PCは3列 */}
      <section className="space-y-4 md:pt-4 md:pb-6 pt-3 pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-primary-800">あなたへのおすすめ</h2>

        {recommended.length === 0 ? (
          <p className="text-sm text-text-muted">
            おすすめを表示できる病院データがまだありません。
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommended.map((h) => {
              const hero = recommendedHeroMap[h.id] || "/images/hero-hospital.jpg";
              const salaryText = formatSalary(h.salary_1st_year_max, h.salary_1st_year_min);
              const pr = truncate(h.pr_highlights ?? "あなたの条件に近い病院です。", 80);

              return (
                <Link
                  key={h.id}
                  href={`/student/hospitals/${h.id}`}
                  className="rounded-2xl bg-white border border-blue-100 hover:shadow-sm transition overflow-hidden"
                >
                  <div className="w-full h-40 md:h-28 bg-slate-100 overflow-hidden">
                    {recommendedHeroMap[h.id] ? (
                      <img src={hero} alt={h.name} className="w-full h-full object-cover" />
                    ) : (
                      <Image src={hero} alt={h.name} width={800} height={400} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary-800 line-clamp-2">{h.name}</p>
                        <p className="text-xs text-text-muted">
                          {h.prefecture ?? "—"}・{h.region ?? "エリア未設定"}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 text-[10px] rounded-full bg-primary-50 text-primary-700">
                        おすすめ
                      </span>
                    </div>

                    <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                      <span className="font-semibold text-primary-800">{salaryText}</span>
                      <span className="ml-1">{pr}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}