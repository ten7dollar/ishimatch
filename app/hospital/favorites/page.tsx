"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavoriteStudents, type FavStudent } from "../_providers/favorite-students";

export default function HospitalFavoritesPage() {
  const { favorites, toggleFavorite, clearAll } = useFavoriteStudents();
  const list = Object.values(favorites) as FavStudent[];

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">お気に入り学生</h1>
          <p className="text-gray-600">{list.length}名の学生をお気に入り登録しています</p>
        </div>
        {list.length > 0 && (
          <button onClick={clearAll} className="text-sm text-gray-500 underline">
            すべて外す
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border rounded bg-gray-50">
          まだお気に入り学生がいません。学生詳細の「お気に入りに追加」を押すとここに表示されます。
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((s) => (
            <div key={s.id} className="rounded-xl border bg-white p-4 relative">
              {/* 右上ハート：off にしたら即消える */}
              <button
                onClick={() => toggleFavorite(s)}
                className="absolute right-4 top-4"
                aria-label="お気に入りの切り替え"
              >
                <Heart className="w-5 h-5" fill={"#ef4444"} color={"#ef4444"} />
              </button>

              {/* カード内容（縦一列） */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                  {s.name.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-primary-700">{s.name}</div>
                  <div className="text-sm text-gray-600">{s.university}・{s.gradYear}年卒</div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/hospital/scouts/new?studentId=${encodeURIComponent(s.id)}`}
                  className="px-3 py-1 rounded bg-primary-500 text-white text-sm hover:bg-blue-700 transition"
                >
                  スカウト
                </Link>
                <Link
                  href={`/hospital/students/${encodeURIComponent(s.id)}`}
                  className="px-3 py-1 rounded border text-sm"
                >
                  詳細
                </Link>
              </div>

              {/* 追加日などを出したい場合はここに表示できます */}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}