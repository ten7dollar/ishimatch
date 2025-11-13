"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useDbFavorites } from "@/app/hooks/useDbFavorites";

/* ---------- 型（public.hospitals） ---------- */
type HospitalRow = {
  id: string;
  name: string;
  name_kana: string | null;
  prefecture: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  duty_frequency: "~2回" | "3~4回" | "5回以上" | "特になし" | null;
  pr_highlights: string | null;
};

/* =========================================================
   ページ本体
========================================================= */
export default function StudentHospitalDetail() {
  const params = useParams();
  const hospitalId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [row, setRow] = useState<HospitalRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("hospitals")
        .select(
          "id,name,name_kana,prefecture,region,city,address,website_url,facility_type,bed_count,residents_first_year,salary_1st_year_min,salary_1st_year_max,duty_frequency,pr_highlights"
        )
        .eq("id", hospitalId)
        .maybeSingle();

      if (!error) setRow((data as HospitalRow) ?? null);
      setLoading(false);
    })();
  }, [hospitalId, supabase]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6">
        <p className="text-gray-600">読込中…</p>
      </main>
    );
  }
  if (!row) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6">
        <p className="text-gray-600">該当の病院が見つかりませんでした。</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-10">
      {/* Hero（仮のサムネイル） */}
      <section className="rounded-xl overflow-hidden border bg-gray-50">
        <Image
          src="/images/hero-hospital.jpg"
          alt={row.name}
          width={1200}
          height={360}
          className="object-cover w-full h-64"
        />
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t">
          <div>
            <h1 className="text-xl font-semibold text-primary-700">{row.name}</h1>
            <p className="text-sm text-text-muted">
              {`${row.prefecture ?? "—"}・${row.city ?? "—"}（${row.region ?? "—"}）`}
            </p>
          </div>

          <div className="flex gap-2">
            {row.website_url && (
              <a
                href={row.website_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
              >
                公式サイト
              </a>
            )}
            <Link
              href="/student/saved"
              className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            >
              検討リストを開く
            </Link>

            {/* DB 検討トグル：useDbFavorites を唯一の真実として利用 */}
            <FavButton hospitalId={row.id} />
          </div>
        </div>
      </section>

      {/* 概要 */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <p>
            <span className="text-text-muted">所在地：</span>
            {row.address
              ? row.address
              : `${row.prefecture ?? ""}${row.city ? "・" + row.city : ""}` || "—"}
          </p>
          <p><span className="text-text-muted">救急区分：</span>{row.facility_type ?? "—"}</p>
          <p><span className="text-text-muted">病床数：</span>{row.bed_count ?? "—"}</p>
          <p><span className="text-text-muted">研修医数（1年目）：</span>{row.residents_first_year ?? "—"}</p>
          <p><span className="text-text-muted">当直回数：</span>{row.duty_frequency ?? "—"}</p>
          <p>
            <span className="text-text-muted">年収：</span>
            {row.salary_1st_year_min
              ? `${row.salary_1st_year_min}万〜${row.salary_1st_year_max ?? "—"}万`
              : "—"}
          </p>
        </div>
      </section>

      {/* PR ハイライト */}
      {row.pr_highlights && (
        <section className="card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-primary-700">PRハイライト</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{row.pr_highlights}</p>
        </section>
      )}

      {/* アクション */}
      <div className="flex gap-3 justify-end">
        <Link
          href={`/student/apply?hospitalId=${encodeURIComponent(row.id)}`}
          className="bg-primary-500 text-white rounded-md px-4 py-2 text-sm hover:bg-primary-600 transition"
        >
          初回面談を申し込む
        </Link>
      </div>
    </main>
  );
}

/* =========================================================
   検討リスト（DB）用トグルボタン
   - useDbFavorites を唯一の真実として利用
   - hook 側の API 名の差異にも耐える薄いアダプタ
========================================================= */
function FavButton({ hospitalId }: { hospitalId: string }) {
  // Hook 形の差異を吸収しつつ呼び出す（ランタイム安全優先）
  const fav = useDbFavorites() as any;

  // 可能な API 名を順に試して判定
  const isActive =
    !!fav?.isFavorite?.(hospitalId) ||
    !!fav?.has?.(hospitalId) ||
    !!fav?.isFav?.(hospitalId) ||
    false;

  const toggle = async () => {
    if (fav?.toggleFavorite) await fav.toggleFavorite(hospitalId);
    else if (fav?.toggle) await fav.toggle(hospitalId);
    else if (fav?.upsertDelete) await fav.upsertDelete(hospitalId);
    // Hook 側に refresh がある場合は反映を待って一覧/ダッシュに即時伝播
    if (fav?.refresh) await fav.refresh();
  };

  return (
    <button
      onClick={toggle}
      aria-label="検討に追加"
      className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 ${
        isActive ? "bg-red-50 text-red-600 border-red-300" : "hover:bg-gray-50"
      }`}
    >
      <Heart
        className="w-4 h-4"
        color={isActive ? "#ef4444" : "#666"}
        fill={isActive ? "#ef4444" : "transparent"}
      />
      {isActive ? "検討中" : "検討に追加"}
    </button>
  );
}