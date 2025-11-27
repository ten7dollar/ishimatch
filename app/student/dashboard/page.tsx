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

/* ---------- 型（Ranking / おすすめ用） ---------- */
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
  if (!max) return "—";
  const maxStr = max.toLocaleString("ja-JP");
  if (!min) return `${maxStr}万円 / 年`;
  const minStr = min.toLocaleString("ja-JP");
  return `${minStr}〜${maxStr}万円 / 年`;
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

  // 検討リスト件数
  const { count: favoritesCount } = useFavoriteHospitals();

  // 未読スカウト件数（/student/scouts と同じテーブルロジックで数える）
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

  // 初回＋Realtime購読
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

  // ランキング用 HERO
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

  /* ========== あなたへのおすすめ（ランダム3件） ========== */

  const [recommended, setRecommended] = useState<HospitalRow[]>([]);
  const [recommendedHeroMap, setRecommendedHeroMap] = useState<HeroMap>({});

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("hospitals_resolved")
          .select(
            "id,name,prefecture,region,salary_1st_year_min,salary_1st_year_max,pr_highlights"
          )
          .limit(30);

        if (error) {
          console.error("[dashboard] recommended fetch error", error);
          setRecommended([]);
          return;
        }

        const list = (data ?? []) as HospitalRow[];
        if (!list.length) {
          setRecommended([]);
          return;
        }

        // シンプルなシャッフルでランダム3件（必要なら ranking の病院を除外してもOK）
        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setRecommended(shuffled.slice(0, 3));
      } catch (e) {
        console.error("[dashboard] recommended unexpected error", e);
        setRecommended([]);
      }
    })();
  }, [supabase]);

  // おすすめ用 HERO
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
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1>ダッシュボード</h1>
          <p className="text-text-muted">あなたに最適な研修病院を見つけましょう</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:min-w-[260px]">
          <Link
            href="/student/saved"
            className="card hover:shadow-md transition shadow-sm px-4 py-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">検討リスト</p>
              <Heart className="w-4 h-4 text-primary-600" />
            </div>
            <p className="text-xl font-bold text-primary-600 mt-1">{favoritesCount}</p>
          </Link>

          <Link
            href="/student/scouts"
            className="card hover:shadow-md transition shadow-sm px-4 py-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">未読スカウト</p>
              <MessageCircle className="w-4 h-4 text-primary-600" />
            </div>
            <p className="text-xl font-bold text-primary-600 mt-1">{unreadCount}</p>
          </Link>
        </div>
      </header>

      {/* 初年度年収ランキング */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-primary-700">初年度年収ランキング</h2>
        </div>
        <p className="text-xs text-text-muted">
          salary_1st_year_max が高い順に上位3病院を表示しています。
        </p>

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
              const salaryText = formatSalary(h.salary_1st_year_max, h.salary_1st_year_min);
              const pr = truncate(
                h.pr_highlights ?? "PR情報は準備中です。",
                50
              );

              return (
                <Link
                  key={h.id}
                  href={`/student/hospitals/${h.id}`}
                  className="min-w-[260px] max-w-[320px] bg-white rounded-2xl shadow-sm hover:shadow-md transition flex-shrink-0 border border-gray-100"
                >
                  <div className="w-full h-32 rounded-t-2xl overflow-hidden">
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
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {h.prefecture ?? "—"}・初期
                        </span>
                        <span className="mt-1 text-sm font-semibold text-primary-700 line-clamp-1">
                          {idx + 1}位：{h.name}
                        </span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-primary-600">{salaryText}</p>
                    <p className="text-xs text-text-muted leading-relaxed">{pr}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* あなたへのおすすめ（DBからランダム3件） */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">あなたへのおすすめ</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {recommended.length === 0 ? (
            <p className="text-sm text-text-muted">
              おすすめを表示できる病院データがまだありません。
            </p>
          ) : (
            recommended.map((h) => {
              const hero = recommendedHeroMap[h.id] || "/images/hero-hospital.jpg";
              const salaryText = formatSalary(h.salary_1st_year_max, h.salary_1st_year_min);
              const pr = truncate(
                h.pr_highlights ?? "あなたの条件に近い病院です。",
                60
              );

              return (
                <div
                  key={h.id}
                  className="card hover:shadow-md transition shadow-sm p-4 flex flex-col justify-between"
                >
                  <div className="w-full h-24 rounded-xl overflow-hidden mb-3">
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

                  {/* 上部：タイトルとタグ */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-primary-700 line-clamp-2">
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

                  {/* 中央：テキストとグラフを横並び */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex-1 space-y-1 text-xs text-text leading-relaxed">
                      <p>
                        <span className="text-text-muted">年収：</span>
                        {salaryText}
                      </p>
                      <p className="text-text-muted">{pr}</p>
                    </div>

                    <div className="w-24 h-24 md:w-28 md:h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
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

                  {/* 下部：詳細ボタンのみ */}
                  <div className="flex justify-end mt-3">
                    <Link
                      href={`/student/hospitals/${h.id}`}
                      className="border border-primary-500 text-primary-600 rounded-md px-3 py-1 text-sm hover:bg-primary-50 transition"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 病院を探す（検索導線） */}
      <section className="grid md:grid-cols-1 gap-6">
        <Link
          href="/student/browse"
          className="card group hover:shadow-md transition shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary-50">
              <Filter className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary-700">病院を探す</h2>
                <ArrowRight className="w-5 h-5 text-primary-600 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className="text-sm text-text-muted mt-1">希望条件を指定して絞り込み</p>
              <p className="text-sm text-text mt-3">
                勤務地、年収、当直回数など、詳細な条件を指定して病院を検索できます。
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* 「最近見た病院」「最近の通知」は削除 */}
    </main>
  );
}