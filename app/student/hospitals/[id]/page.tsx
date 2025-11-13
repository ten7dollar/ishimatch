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

  // 病院1件取得
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

            {/* 検討トグル */}
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
   検討リストトグル（即時反映・API名の差異を吸収）
========================================================= */
function FavButton({ hospitalId }: { hospitalId: string }) {
  // あなたの hook（API 名は環境差がある前提）
  const fav = useDbFavorites() as any;

  // re-render トリガーになる一覧（list / rows / items / favorites のどれか）
  const dep =
    fav?.list ?? fav?.rows ?? fav?.items ?? fav?.favorites ?? {};

  // active 判定関数（存在するものを使う）
  const isActive: boolean = useMemo(() => {
    const fn =
      fav?.has ||          // 例: has(id)
      fav?.isFavorite ||   // 例: isFavorite(id)
      fav?.isFav;          // 例: isFav(id)

    try {
      return typeof fn === "function" ? !!fn.call(fav, hospitalId) : false;
    } catch {
      return false;
    }
    // dep を依存に入れることでトグル直後に即 re-render
  }, [hospitalId, dep]);

  // トグル関数（存在する名前を順に試す）
  const toggle = async () => {
    const fn =
      fav?.toggle ||           // 例: toggle(id)
      fav?.toggleFavorite ||   // 例: toggleFavorite(id)
      fav?.upsertDelete;       // 例: upsertDelete(id)

    if (typeof fn === "function") {
      await fn.call(fav, hospitalId);
      // hook 側に refresh があれば即同期
      if (typeof fav?.refresh === "function") await fav.refresh();
    }
  };

  const busy = !!fav?.loading;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={isActive}
      aria-label={isActive ? "検討中" : "検討に追加"}
      className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 transition
        ${isActive ? "bg-red-50 text-red-600 border-red-300" : "hover:bg-gray-50"}
        ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <Heart
        className="w-4 h-4"
        color={isActive ? "#ef4444" : "#666"}
        fill={isActive ? "#ef4444" : "transparent"}
      />
      <span>{isActive ? "検討中" : "検討に追加"}</span>
    </button>
  );
}