"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// 病院側：学生お気に入り Provider（相対パス）
import { useFavoriteStudents, type FavStudent } from "../../_providers/favorite-students";

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "unknown";

  // 実際は API / DB フェッチ予定（ここではダミー）
  const student = getMockStudent(idParam);

  // お気に入り（病院側）
  const { isFavorite, toggleFavorite } = useFavoriteStudents();
  const isFav = isFavorite(student.id);

  const handleToggleFavorite = () => {
    const payload: FavStudent = {
      id: student.id,
      name: student.name,
      university: student.university,
      gradYear: student.gradYear,
    };
    toggleFavorite(payload); // ← localStorage に保存（ishimatch:hospital:fav:students）
  };

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-8">
      {/* 戻る */}
      <button onClick={() => router.back()} className="flex items-center text-primary-600 text-sm hover:underline">
        <ArrowLeft className="w-4 h-4 mr-1" />
        戻る
      </button>

      <h1 className="text-xl font-semibold">学生プロフィール</h1>
      <p className="text-text-muted text-sm">{student.name}さんの詳細情報とマッチング状況</p>

      {/* ── ヘッダーカード（右：アクション2ボタン） ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-6">
          {/* 左：基本情報 */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold">
              {student.name.slice(0, 2)}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">{student.name}</h2>
              <p className="text-text-muted text-sm">{student.university}</p>
              <div className="flex gap-4 text-sm text-text-muted">
                <span>卒業予定：{student.graduation}</span>
                <span>希望勤務地：{student.area.join("、")}</span>
                <span>志望科：{student.major.join("、")}</span>
              </div>
            </div>
          </div>

          {/* 右：アクション 2ボタン（スカウト＝新画面へ遷移） */}
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/hospital/scouts/new?studentId=${encodeURIComponent(student.id)}`}
              className="px-3 py-2 rounded bg-primary-600 text-white text-sm hover:bg-primary-700 transition"
            >
              スカウトを送る
            </Link>
            <button
              onClick={handleToggleFavorite}
              className={`px-3 py-2 rounded border text-sm hover:bg-gray-50 transition ${
                isFav ? "border-primary-500 text-primary-600" : ""
              }`}
              title={isFav ? "お気に入り解除" : "お気に入りに追加"}
            >
              {isFav ? "お気に入り解除" : "お気に入りに追加する"}
            </button>
          </div>
        </div>

        {/* スコア */}
        <div className="grid md:grid-cols-3 gap-4 text-center mt-4">
          {[
            { label: "マッチ度", value: student.match },
            { label: "返信速度", value: student.activity },
            { label: "情報充実度", value: student.update },
          ].map((item) => (
            <div key={item.label} className="border rounded-md p-4 flex flex-col gap-2 items-center">
              <p className="text-sm text-text-muted">{item.label}</p>
              <p className="text-2xl font-semibold text-primary-600">{item.value}</p>
              <div className="w-full h-1.5 bg-primary-100 rounded-full">
                <div className="h-1.5 bg-primary-500 rounded-full" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 自己PR */}
      <section className="card p-6 space-y-4">
        <h3 className="text-primary-700 font-semibold">自己PR・志望動機</h3>
        <p className="text-text text-sm">{student.pr}</p>
      </section>

      {/* 希望条件 */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2 text-sm">
          <h4 className="font-semibold text-primary-700">希望条件</h4>
          <p><span className="font-medium">希望勤務地：</span>{student.area.join("、")}</p>
          <p><span className="font-medium">志望診療科：</span>{student.major.join("、")}</p>
          <p><span className="font-medium">希望年収：</span>{student.desiredSalary}</p>
        </div>
        <div className="card p-4 space-y-2 text-sm">
          <h4 className="font-semibold text-primary-700">勤務希望</h4>
          <p><span className="font-medium">当直可否：</span>可能</p>
          <p><span className="font-medium">見学希望：</span>可能</p>
          <p><span className="font-medium">交通費補助希望：</span>あり</p>
        </div>
      </section>

      {/* 活動履歴（カード化 & 整列） */}
      <section className="card p-6 space-y-4">
        <h3 className="text-primary-700 font-semibold">活動履歴</h3>

        <div className="space-y-3">
          {student.history.map((h, i) => (
            <div
              key={i}
              className="grid md:grid-cols-[120px_1fr] gap-4 items-start rounded-md border p-3 bg-white/70"
            >
              {/* 左：日付（固定幅） */}
              <div className="text-sm text-text-muted md:text-right">{h.date}</div>
              {/* 右：タイトル＋説明（カード） */}
              <div className="space-y-1">
                <p className="font-medium text-text">{h.title}</p>
                <p className="text-xs text-text-muted">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/* ダミー取得：本番は API/DB に置き換え */
function getMockStudent(id: string) {
  return {
    id,
    name: "山田太郎",
    age: 25,
    university: "東京大学医学部",
    graduation: "2026年3月",
    gradYear: "2026",
    area: ["東京都"],
    major: ["救急科"],
    match: 85,
    activity: 92,
    update: 88,
    pr: "救急医療に強い関心があり、初期研修では幅広い症例を経験したいと考えています。ACLSも取得済みです。",
    desiredSalary: "500万円以上",
    skill: [
      { name: "ACLS（二次心肺蘇生法）", date: "2024年4月取得" },
      { name: "TOEIC 850点", date: "2023年12月取得" },
      { name: "普通自動車免許", date: "2021年3月取得" },
    ],
    history: [
      { date: "2025/11/02", title: "プロフィール更新", desc: "自己PRと希望条件を更新しました" },
      { date: "2025/10/25", title: "見学申込", desc: "3つの病院に見学申込を行いました" },
      { date: "2025/10/15", title: "診断完了", desc: "本診断を完了し、おすすめ病院を確認しました" },
    ],
  };
}