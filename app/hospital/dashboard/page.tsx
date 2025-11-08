"use client";

import { useState } from "react";
// お気に入り学生の件数
import { useFavoriteStudents } from "../_providers/favorite-students";
// スカウト送付/応募の集計
import { useScoutsOutbox } from "../_providers/scout-outbox";

export default function HospitalDashboard() {
  const [isPublic, setIsPublic] = useState(true);

  // お気に入り学生の件数
  const { count: favoritesCount } = useFavoriteStudents();
  // スカウト集計
  const { sentCount, appliedCount } = useScoutsOutbox();

  return (
    <main className="max-w-6xl mx-auto px-8 py-6 space-y-10">
      {/* ===== タイトル ===== */}
      <div>
        <h1>ダッシュボード</h1>
        <p className="text-text-muted">採用活動の状況を一目で確認できます。</p>
      </div>

      {/* ===== KPIカード群（今月の応募 / お気に入り / スカウトステータス） ===== */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* 今月の応募 → 応募管理に遷移 */}
        <a
          href="/hospital/applications"
          className="card flex flex-col gap-1 hover:bg-primary-50 transition"
          title="応募管理を開く"
        >
          <span className="text-sm text-text-muted">今月の応募</span>
          <div className="flex items-baseline gap-2">
            {/* 値は必要に応じて差し替え。MVPは0でもOK */}
            <p className="text-3xl font-bold text-primary-600">12</p>
            <span className="text-sm text-primary-500">+3</span>
          </div>
        </a>

        {/* お気に入り学生（件数は Provider 実数）→ お気に入り学生一覧へ */}
        <a
          href="/hospital/favorites"
          className="card flex flex-col gap-1 hover:bg-primary-50 transition"
          title="お気に入り学生一覧を開く"
        >
          <span className="text-sm text-text-muted">お気に入り</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-primary-600">{favoritesCount}</p>
          </div>
        </a>

        {/* スカウトステータス（応募数 / 送付数）→ ステータスへ */}
        <a
          href="/hospital/scouts"
          className="card flex flex-col gap-1 hover:bg-primary-50 transition"
          title="スカウトステータスへ"
        >
          <span className="text-sm text-text-muted">スカウトステータス</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-primary-600">
              {appliedCount} / {sentCount}
            </p>
            <span className="text-sm text-primary-500">
              {sentCount ? `${Math.round((appliedCount / sentCount) * 100)}%` : "0%"}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">応募数 / 送付数</p>
        </a>
      </div>

      {/* ===== クイックアクション & 二次マッチ枠 ===== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* クイックアクション */}
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-primary-700">クイックアクション</h2>
          <p className="text-text-muted text-sm">よく使う機能へ素早くアクセス</p>

          <div className="flex flex-col gap-3">
            <a
              href="/hospital/pr"
              className="border rounded-md py-2 px-3 flex items-center justify-between hover:bg-primary-50 transition"
            >
              <span className="text-text">PRページを編集</span>
              <span className="text-primary-600 text-sm font-medium">→</span>
            </a>

            <a
              href="/hospital/students"
              className="border rounded-md py-2 px-3 flex items-center justify-between hover:bg-primary-50 transition"
            >
              <span className="text-text">学生を探す</span>
              <span className="text-primary-600 text-sm font-medium">→</span>
            </a>

            <div className="flex items-center justify-between border rounded-md py-2 px-3">
              <span className="text-text">公開状態</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isPublic ? "text-primary-600" : "text-text-muted"}`}>
                  {isPublic ? "公開中" : "非公開"}
                </span>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                  className="accent-primary-500 h-5 w-5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 二次マッチ枠 */}
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-primary-700">二次マッチ枠</h2>
          <p className="text-text-muted text-sm">現在の募集状況を設定</p>
          <select className="border rounded-md px-3 py-2 focus:ring focus:ring-primary-300">
            <option>空きあり</option>
            <option>残りわずか</option>
            <option>募集終了</option>
          </select>
          <p className="text-sm text-text-muted">学生検索結果に表示されるステータスです。</p>
        </div>
      </div>

      {/* ===== PR完成度 ===== */}
      <section className="card p-5">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg font-semibold text-primary-700">PR完成度</h2>
            <p className="text-text-muted text-sm">まずはPRページの完成度を100%にしましょう。</p>
          </div>
          <span className="text-sm text-primary-600 font-semibold">75%</span>
        </div>

        <div className="w-full bg-primary-50 h-3 rounded-full overflow-hidden mb-4">
          <div className="bg-primary-500 h-3 w-[75%] rounded-full" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span>病院概要</span>
          <span>PRポイント</span>
          <span>求人詳細</span>
          <span>資料</span>
          <button className="ml-auto border border-primary-500 text-primary-600 rounded-md px-3 py-1 text-sm hover:bg-primary-50 transition">
            不足項目を見る
          </button>
        </div>
      </section>

      {/* ===== 最近の応募（ダミーのまま） ===== */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-primary-700 mb-3">最近の応募</h2>
        <p className="text-text-muted text-sm mb-4">直近の応募者を確認し、アクションを実行</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-text-muted border-b">
              <tr>
                <th className="py-2 px-4">学生名</th>
                <th className="py-2 px-4">大学・卒年</th>
                <th className="py-2 px-4">応募日</th>
                <th className="py-2 px-4">ステータス</th>
                <th className="py-2 px-4">アクション</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "山田太郎", university: "東京大学医学部 2026卒", date: "11月2日", status: "送信",   color: "bg-blue-100 text-primary-700" },
                { name: "佐藤花子", university: "京都大学医学部 2026卒", date: "11月1日", status: "閲覧済", color: "bg-green-100 text-green-700" },
                { name: "鈴木一郎", university: "大阪大学医学部 2025卒", date: "10月30日", status: "面談打診", color: "bg-purple-100 text-purple-700" },
              ].map((s, i) => (
                <tr key={i} className="border-b hover:bg-primary-50 transition">
                  <td className="py-2 px-4 font-semibold text-primary-700">{s.name}</td>
                  <td className="py-2 px-4">{s.university}</td>
                  <td className="py-2 px-4">{s.date}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.status}</span>
                  </td>
                  <td className="py-2 px-4 text-primary-600 font-medium cursor-pointer hover:underline">詳細</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}