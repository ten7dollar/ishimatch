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

// ★ Provider
import { useFavoriteHospitals } from "../_providers/favorite-hospitals";
import { useScouts } from "../_providers/scouts";

/* ---------- 型（Ranking 用） ---------- */
type RankingHospital = {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  pr_highlights: string | null;
};

type HeroMap = Record<string, string | null>;

/* ---------- ユーティリティ ---------- */
const formatSalary = (max: number | null, min?: number | null) => {
  if (!max) return "—";
  const maxStr = max.toLocaleString("ja-JP");
  if (!min) return `${maxStr}万円 / 年`;
  const minStr = min.toLocaleString("ja-JP");
  return `${minStr}〜${maxStr}万円 / 年`;
};

const truncate = (text: string, max: number) => {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
};

export default function StudentDashboard() {
  // Supabase クライアント
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // 検討リストの件数（Provider から）
  const { count: favoritesCount } = useFavoriteHospitals();

  // 未読スカウト件数（Provider から）＋念のため list から補正
  const scouts = useScouts() as any;
  const providerUnread = typeof scouts?.unreadCount === "number" ? scouts.unreadCount : 0;
  const listUnread =
    Array.isArray(scouts?.list) || Array.isArray(scouts?.items)
      ? (scouts.list ?? scouts.items).filter(
          (s: any) => !s.read_at && !s.is_read
        ).length
      : 0;
  const unreadCount = providerUnread || listUnread;

  // グラフデータ（「あなたへのおすすめ」で使うダミーデータ）
  const radarData = [
    { subject: "給与", A: 4 },
    { subject: "手技", A: 5 },
    { subject: "教育", A: 3 },
    { subject: "症例数", A: 4 },
    { subject: "当直", A: 2 },
  ];

  // 初年度年収ランキング
  const [ranking, setRanking] = useState<RankingHospital[]>([]);
  const [heroMap, setHeroMap] = useState<HeroMap>({});
  const [rankingLoading, setRankingLoading] = useState(false);

  // ランキング用病院データを取得
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
          setRanking((data ?? []) as RankingHospital[]);
        }
      } catch (e) {
        console.error("[dashboard] ranking unexpected error", e);
        setRanking([]);
      } finally {
        setRankingLoading(false);
      }
    })();
  }, [supabase]);

  // ランキング用の HERO 画像URLを API から取得
  useEffect(() => {
    if (!ranking.length) {
      setHeroMap({});
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
        setHeroMap(next);
      } catch (e) {
        console.error("[dashboard] ranking hero fetch error", e);
      }
    })();
  }, [ranking]);

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-10">
      {/* タイトル */}
      <div>
        <h1>ダッシュボード</h1>
        <p className="text-text-muted">あなたに最適な研修病院を見つけましょう</p>
      </div>

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
              const hero = heroMap[h.id] || "/images/hero-hospital.jpg";
              const salaryText = formatSalary(h.salary_1st_year_max, h.salary_1st_year_min);
              const pr = truncate(h.pr_highlights ?? "PR情報は準備中です。", 50);

              return (
                <Link
                  key={h.id}
                  href={`/student/hospitals/${h.id}`}
                  className="min-w-[260px] max-w-[320px] bg-white rounded-2xl shadow-sm hover:shadow-md transition flex-shrink-0 border border-gray-100"
                >
                  <div className="w-full h-32 rounded-t-2xl overflow-hidden">
                    {heroMap[h.id] ? (
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
                    <p className="text-lg font-bold text-primary-600">
                      {salaryText}
                    </p>
                    <p className="text-xs text-text-muted leading-relaxed">{pr}</p>
                  </div>
                </Link>
              );
            })}
          </div>
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

      {/* KPI（検討リスト／未読スカウト） */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href="/student/saved"
          className="card hover:shadow-md transition shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">検討リスト</p>
            <Heart className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-primary-600 mt-1">{favoritesCount}</p>
        </Link>

        {/* 最近見た病院カードは削除 */}

        <Link
          href="/student/scouts"
          className="card hover:shadow-md transition shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">未読スカウト</p>
            <MessageCircle className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-primary-600 mt-1">{unreadCount}</p>
        </Link>
      </section>

      {/* あなたへのおすすめ（既存を軽く立体化） */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">あなたへのおすすめ</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              id: "h1",
              name: "東京中央医療センター",
              area: "東京都",
              type: "複合",
              salary: "520万円程度",
              emergency: "二次救急",
              interns: "10〜20人",
              night: "〜2回以下",
              match: "空きあり",
            },
            {
              id: "h2",
              name: "信州地域総合病院",
              area: "長野県",
              type: "地方",
              salary: "600万円程度",
              emergency: "二次救急",
              interns: "5〜10人",
              night: "3〜4回",
              match: "残りわずか",
            },
            {
              id: "h3",
              name: "大阪大学医学部附属病院",
              area: "大阪府",
              type: "複合",
              salary: "450万円程度",
              emergency: "三次救急",
              interns: "20人〜",
              night: "〜2回以下",
              match: "締切",
            },
          ].map((h) => (
            <div
              key={h.id}
              className="card hover:shadow-md transition shadow-sm p-4 flex flex-col justify-between"
            >
              {/* 上部：タイトルとマッチステータス */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-primary-700">{h.name}</h3>
                  <p className="text-xs text-text-muted">
                    {h.area}・{h.type}
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary-50 text-primary-700">
                  二次マッチ：{h.match}
                </span>
              </div>

              {/* 中央：テキストとグラフを横並び */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex-1 space-y-1 text-xs text-text leading-relaxed">
                  <p>
                    <span className="text-text-muted">年収：</span>
                    {h.salary}
                  </p>
                  <p>
                    <span className="text-text-muted">救急：</span>
                    {h.emergency}
                  </p>
                  <p>
                    <span className="text-text-muted">研修医数：</span>
                    {h.interns}
                  </p>
                  <p>
                    <span className="text-text-muted">当直：</span>
                    {h.night}
                  </p>
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
          ))}
        </div>
      </section>

      {/* 「最近の通知」セクションは削除 */}
    </main>
  );
}