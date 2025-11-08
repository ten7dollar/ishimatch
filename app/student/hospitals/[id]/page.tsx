"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useFavoriteHospitals, type Hospital } from "../../_providers/favorite-hospitals";

export default function StudentHospitalDetail() {
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "unknown";
  const { isFavorite, toggleFavorite } = useFavoriteHospitals();

  // ← 本番は idParam でDBから取得してください
  const hospital = getHospitalById(idParam);

  // favorites に保存する最小情報
  const favPayload: Hospital = {
    id: idParam,
    name: hospital.name,
    prefecture: hospital.meta.prefecture,
    area: hospital.meta.area,
    salary: hospital.meta.salary,
    emergency: hospital.meta.emergency,
    residents: hospital.meta.residents,
    beds: hospital.meta.beds,
    duty: hospital.meta.duty,
    tags: hospital.meta.tags,
  };

  const active = isFavorite(idParam);

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-10">
      {/* Hero */}
      <section className="rounded-xl overflow-hidden border">
        <Image src={hospital.hero} alt={hospital.name} width={1200} height={400} className="object-cover w-full h-64" />
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t">
          <div className="flex items-center gap-4">
            <Image src={hospital.logo} alt="logo" width={60} height={60} className="rounded-md border" />
            <div>
              <h1 className="text-xl font-semibold text-primary-700">{hospital.name}</h1>
              <p className="text-sm text-text-muted">{hospital.meta.prefecture}・{hospital.meta.area}</p>
            </div>
          </div>

          {/* お気に入りトグル */}
          <button
            onClick={() => toggleFavorite(favPayload)}
            className="flex items-center gap-2 px-3 py-2 border rounded"
            aria-label={active ? "お気に入り解除" : "お気に入り追加"}
          >
            <Heart className="w-5 h-5" fill={active ? "#ef4444" : "transparent"} color={active ? "#ef4444" : "#bbb"} />
            <span>{active ? "お気に入り解除" : "お気に入りに追加"}</span>
          </button>
        </div>
      </section>

      {/* 病院概要 */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="text-text-muted">所在地：</span>{hospital.overview.address}</p>
          <p><span className="text-text-muted">指導医数：</span>{hospital.overview.doctors}名</p>
          <p><span className="text-text-muted">救急区分：</span>{hospital.meta.emergency}</p>
          <p><span className="text-text-muted">初期研修医：</span>{hospital.overview.interns}</p>
        </div>
      </section>

      {/* PR */}
      <section className="card p-6 space-y-2">
        <h2 className="text-lg font-semibold text-primary-700">PRポイント</h2>
        <h3 className="font-semibold text-primary-600">{hospital.pr.title}</h3>
        <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{hospital.pr.body}</p>
      </section>

      {/* 求人 */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">求人情報</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="text-text-muted">給与（1年次）：</span>{hospital.job.salary1}</p>
          <p><span className="text-text-muted">給与（2年次）：</span>{hospital.job.salary2}</p>
          <p><span className="text-text-muted">当直回数：</span>{hospital.meta.duty}</p>
          <p><span className="text-text-muted">福利厚生：</span>{hospital.job.benefits}</p>
        </div>
      </section>

      {/* 資料 */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">資料ダウンロード</h2>
        <ul className="text-sm space-y-2">
          {hospital.materials.map((m, i) => (
            <li key={i} className="flex items-center justify-between border-b pb-2">
              <span>{m.name}</span>
              <span className="text-xs text-text-muted">{m.updated}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex gap-3 justify-end">
        <a href="/student/saved" className="border border-primary-500 text-primary-600 rounded-md px-4 py-2 hover:bg-primary-50 transition">
          検討リストを開く
        </a>
        <button className="bg-primary-500 text-white rounded-md px-4 py-2 hover:bg-primary-600 transition">
          初回面談を申し込む
        </button>
      </div>
    </main>
  );
}

function getHospitalById(id: string) {
  return {
    id,
    name: "東京中央医療センター",
    hero: "/images/hero-hospital.jpg",
    logo: "/images/hospital-logo.png",
    meta: {
      prefecture: "東京都",
      area: "複合",
      salary: "520〜600万円",
      emergency: "三次救急",
      residents: "10〜20人",
      beds: "500床〜",
      duty: "3〜4回",
      tags: ["二次マッチ：残りわずか", "見学交通費", "家賃補助"],
    },
    overview: { address: "東京都新宿区成城1-2-3", doctors: 36, interns: "10〜20名" },
    pr: {
      title: "手技教育が充実。海外研修もサポート。",
      body: "都心の急性期病院。手技経験が豊富で、初期研修医への教育体制が整っています。\n海外研修プログラムも用意しています。",
    },
    job: {
      salary1: "月給50万円（年収600万円）",
      salary2: "月給55万円（年収660万円）",
      benefits: "残業手当、家賃補助、交通費支給",
    },
    materials: [
      { name: "募集要項.pdf", updated: "2025/10/15" },
      { name: "カリキュラム.pdf", updated: "2025/10/10" },
    ],
  };
}