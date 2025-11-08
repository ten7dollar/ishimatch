"use client";

import Link from "next/link";
import { ArrowRight, Filter, Heart, Eye, MessageCircle } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

// ★ 追加：相対パスで Provider を参照
import { useFavoriteHospitals } from "../_providers/favorite-hospitals";
import { useScouts } from "../_providers/scouts";

export default function StudentDashboard() {
  // 検討リストの件数（Provider から）
  const { count: favoritesCount } = useFavoriteHospitals();
  // 未読スカウト件数（Provider から）
  const { unreadCount } = useScouts();

  // グラフデータ（固定でOK、実際は病院ごとに渡せる）
  const radarData = [
    { subject: "給与", A: 4 },
    { subject: "手技", A: 5 },
    { subject: "教育", A: 3 },
    { subject: "症例数", A: 4 },
    { subject: "当直", A: 2 },
  ];

  // 「最近見た病院」カウントは将来 Cookie/DB 化予定。いまは仮値のまま。
  const recentCount = 5;

  return (
    <main className="max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* タイトル */}
      <div>
        <h1>ダッシュボード</h1>
        <p className="text-text-muted">あなたに最適な研修病院を見つけましょう</p>
      </div>

      {/* 上段：診断で探す / 条件で探す */}
      <section className="grid md:grid-cols-1 gap-6">
        <Link href="/student/browse" className="card group hover:shadow-md transition">
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

      {/* KPI（検討リスト／最近見た病院／未読スカウト） */}
      <section className="grid md:grid-cols-3 gap-4">
        <Link href="/student/saved" className="card hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">検討リスト</p>
            <Heart className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-primary-600 mt-1">{favoritesCount}</p>
        </Link>

        <Link href="/student/hospitals" className="card hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">最近見た病院</p>
            <Eye className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-primary-600 mt-1">{recentCount}</p>
        </Link>

        {/* ★ ここを「未読メッセージ」→「未読スカウト」に変更／遷移先も /student/scouts へ */}
        <Link href="/student/scouts" className="card hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">未読スカウト</p>
            <MessageCircle className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-primary-600 mt-1">{unreadCount}</p>
        </Link>
      </section>

      {/* あなたへのおすすめ（既存のまま） */}
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
            <div key={h.id} className="card hover:shadow-md transition p-4 flex flex-col justify-between">
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
                  <p><span className="text-text-muted">年収：</span>{h.salary}</p>
                  <p><span className="text-text-muted">救急：</span>{h.emergency}</p>
                  <p><span className="text-text-muted">研修医数：</span>{h.interns}</p>
                  <p><span className="text-text-muted">当直：</span>{h.night}</p>
                </div>

                <div className="w-28 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                      <Radar name="スコア" dataKey="A" stroke="#0077B6" fill="#0077B6" fillOpacity={0.3} />
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

      {/* 最近の通知（既存のまま） */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-primary-700">最近の通知</h2>
        {[
          { type: "message", text: "東京中央医療センターからメッセージが届きました", date: "11月1日" },
          { type: "favorite", text: "信州地域総合病院がお気に入りに追加しました", date: "10月30日" },
          { type: "interview", text: "東京中央医療センターから面談打診が届きました", date: "10月28日" },
        ].map((n, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              idx < 2 ? "bg-primary-50/50 border-primary-100" : "bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  n.type === "message"
                    ? "bg-green-400"
                    : n.type === "favorite"
                    ? "bg-pink-400"
                    : "bg-primary-400"
                }`}
              />
              <p className="text-sm text-text">{n.text}</p>
            </div>
            <span className="text-xs text-text-muted">{n.date}</span>
          </div>
        ))}
      </section>
    </main>
  );
}