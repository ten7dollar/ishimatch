"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavoriteHospitals, type Hospital } from "@/app/student/_providers/favorite-hospitals";

export default function SavedHospitalsPage() {
  const { loading, favorites, toggleFavorite, clearAll, count } = useFavoriteHospitals();

  // 表示用配列（お気に入りの Map → 配列化）
  const list: Hospital[] = Object.values(favorites);

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">検討リスト</h1>
          <p className="text-text-muted">
            お気に入りに追加した病院をまとめて確認できます（{count}件）
          </p>
        </div>

        {list.length > 0 && (
          <button onClick={clearAll} className="text-sm text-gray-500 underline">
            すべて外す
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 border rounded bg-gray-50">
          読み込み中…
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border rounded bg-gray-50">
          まだ検討リストが空です。病院詳細ページの「検討に追加」を押すとここに追加されます。
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((h) => (
            <div key={h.id} className="border rounded-xl p-5 bg-white">
              {/* 上部：病院名 + ハート */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary-50 text-primary-700">
                      開
                    </span>
                    <h2 className="font-semibold text-primary-700">{h.name}</h2>
                  </div>
                  <p className="text-xs text-text-muted">
                    {h.prefecture}・{h.area}
                  </p>
                </div>

                {/* 右上ハート：外したら即リストから消える */}
                <button
                  onClick={() => toggleFavorite(h)}
                  className="p-1 rounded-full text-red-500"
                  aria-label="お気に入りの切り替え"
                >
                  <Heart fill={"currentColor"} className="w-5 h-5" />
                </button>
              </div>

              {/* 病院情報 */}
              <div className="grid md:grid-cols-5 gap-x-3 mt-3 text-sm text-text">
                <p><span className="text-text-muted">年収：</span>{h.salary}</p>
                <p><span className="text-text-muted">救急：</span>{h.emergency}</p>
                <p><span className="text-text-muted">研修医数：</span>{h.residents}</p>
                <p><span className="text-text-muted">病床数：</span>{h.beds}</p>
                <p><span className="text-text-muted">当直：</span>{h.duty}</p>
              </div>

              {/* CTA */}
              <div className="flex gap-3 mt-4">
                <Link
                  href={`/student/hospitals/${encodeURIComponent(h.id)}`}
                  className="border border-primary-500 text-primary-600 rounded-md px-3 py-1 text-sm hover:bg-primary-50 transition"
                >
                  詳細を見る
                </Link>
                <Link
                  href={`/student/apply?hospitalId=${encodeURIComponent(h.id)}`}
                  className="bg-primary-500 text-white rounded-md px-3 py-1 text-sm hover:bg-primary-600 transition"
                >
                  初回面談を申し込む
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}