"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { useScouts, type Scout } from "../_providers/scouts";
import { useFavoriteHospitals, type Hospital } from "../_providers/favorite-hospitals";

/** 初回だけダミースカウトを流し込み（Supabase化時は削除） */
function seedOnce(add: (items: Scout[]) => void) {
  if (typeof window === "undefined") return;
  const FLAG = "ishimatch:seed:scouts";
  if (localStorage.getItem(FLAG)) return;

  const now = new Date();
  const iso = (d: Date) => d.toISOString();

  add([
    {
      id: "scout-001",
      hospitalId: "tokyo-chuo-001",
      hospitalName: "東京中央医療センター",
      title: "初期研修で手技を伸ばしませんか？",
      body: "当院では初期研修医への手技トレーニングが充実しています。よろしければカジュアル面談からいかがでしょう。",
      createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 2)), // 2時間前
    },
    {
      id: "scout-002",
      hospitalId: "shinshu-001",
      hospitalName: "信州地域総合病院",
      title: "地域医療×総合診療の仲間を募集",
      body: "総合診療を中心に、幅広い症例で学べます。見学交通費の補助もあります。",
      createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 26)), // 26時間前
    },
  ]);

  localStorage.setItem(FLAG, "1");
}

export default function ScoutInboxPage() {
  const { scouts, unreadCount, markRead, markUnread, addScouts } = useScouts();
  const { isFavorite, toggleFavorite } = useFavoriteHospitals();

  useEffect(() => { seedOnce(addScouts); }, [addScouts]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">スカウト</h1>
          <p className="text-gray-600">病院からのスカウトを確認できます（未読 {unreadCount}件）</p>
        </div>
      </div>

      {scouts.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border rounded bg-gray-50">
          まだスカウトはありません。
        </div>
      ) : (
        <div className="space-y-4">
          {scouts.map((s: Scout) => {
            const active = isFavorite(s.hospitalId);
            const favPayload: Hospital = {
              id: s.hospitalId,
              name: s.hospitalName,
              prefecture: "未設定",
              area: "未設定",
              salary: "未設定",
              emergency: "未設定",
              residents: "未設定",
              beds: "未設定",
              duty: "未設定",
              tags: ["スカウト経由"],
            };

            return (
              <div
                key={s.id}
                className={`border rounded-xl p-5 bg-white ${!s.readAt ? "ring-1 ring-primary-300" : ""}`}
                onMouseEnter={() => markRead(s.id)} // 既読化は hover で
              >
                {/* 見出し */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {!s.readAt && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary-50 text-primary-700">
                          新着
                        </span>
                      )}
                      <h2 className="font-semibold text-primary-700">{s.title}</h2>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* 検討リストに入れるハート（任意） */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(favPayload); }}
                    className="p-1 rounded-full"
                    aria-label="お気に入り切り替え"
                    title={active ? "お気に入り解除" : "お気に入りに追加"}
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={active ? "#ef4444" : "transparent"}
                      color={active ? "#ef4444" : "#bbb"}
                    />
                  </button>
                </div>

                {/* 本文 */}
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{s.body}</p>

                {/* CTA：未読に戻す／詳細を見に行く */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => markUnread(s.id)} // ★ 未読に戻す
                    className="px-3 py-1 rounded border text-sm"
                  >
                    未読に戻す
                  </button>
                  <Link
                    href={`/student/hospitals/${encodeURIComponent(s.hospitalId)}?from=scout=${encodeURIComponent(s.id)}`}
                    className="px-3 py-1 rounded bg-primary-600 text-white text-sm"
                  >
                    詳細を見に行く
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}