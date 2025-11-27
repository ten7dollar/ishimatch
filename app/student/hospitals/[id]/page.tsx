"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useDbFavorites } from "@/app/hooks/useDbFavorites";

/* ---------- 型（public.hospitals_resolved） ---------- */
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
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  // 病院情報の取得（既存どおり）
  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("hospitals_resolved")
        .select(
          "id,name,name_kana,prefecture,region,city,address,website_url,facility_type,bed_count,residents_first_year,salary_1st_year_min,salary_1st_year_max,duty_frequency,pr_highlights"
        )
        .eq("id", hospitalId)
        .maybeSingle();

      if (!error) setRow((data as HospitalRow) ?? null);
      setLoading(false);
    })();
  }, [hospitalId, supabase]);

  // HERO画像の取得（新規追加部分）
  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      try {
        const res = await fetch(`/api/hospitals/hero?hospitalId=${encodeURIComponent(hospitalId)}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) {
          console.warn("[student/hospitals/[id]] /api/hospitals/hero status", res.status);
          setHeroUrl(null);
          return;
        }
        const json = (await res.json()) as { url: string | null };
        setHeroUrl(json.url || null);
      } catch (e) {
        console.error("[student/hospitals/[id]] hero fetch error", e);
        setHeroUrl(null);
      }
    })();
  }, [hospitalId]);

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

  const heroSrc = heroUrl || "/images/hero-hospital.jpg";

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-10">
      {/* Hero */}
      <section className="rounded-xl overflow-hidden border bg-gray-50">
        <Image
          src={heroSrc}
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
          <p>
            <span className="text-text-muted">救急区分：</span>
            {row.facility_type ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">病床数：</span>
            {row.bed_count ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">研修医数（1年目）：</span>
            {row.residents_first_year ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">当直回数：</span>
            {row.duty_frequency ?? "—"}
          </p>
          <p>
            <span className="text-text-muted">年収：</span>
            {row.salary_1st_year_min
              ? `${row.salary_1st_year_min}万〜${row.salary_1st_year_max ?? "—"}万`
              : "—"}
          </p>
        </div>
      </section>

      {/* PR ハイライト（公開/非公開の制御は将来 hospitals_resolved に載せたくなったときに拡張） */}
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
   検討リストトグル（DB）
========================================================= */
function FavButton({ hospitalId }: { hospitalId: string }) {
  const fav = useDbFavorites() as {
    list: Array<{ hospital_id: string }>;
    isFavorite?: (id: string) => boolean;
    has?: (id: string) => boolean;
    toggleFavorite?: (id: string) => Promise<void>;
    toggle?: (id: string) => Promise<void>;
    upsertDelete?: (id: string) => Promise<void>;
    refresh?: () => Promise<void>;
  };

  // フックが未初期化でも安全に
  const safeHas = (id: string) =>
    (typeof fav?.isFavorite === "function" && fav.isFavorite(id)) ||
    (typeof fav?.has === "function" && fav.has(id)) ||
    (Array.isArray(fav?.list) && fav.list.some((r) => r.hospital_id === id)) ||
    false;

  const [active, setActive] = useState<boolean>(safeHas(hospitalId));
  const [busy, setBusy] = useState(false);

  // フック側の list 変化に追随
  useEffect(() => {
    setActive(safeHas(hospitalId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fav?.list, hospitalId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    // 楽観更新
    setActive((prev) => !prev);
    try {
      if (typeof fav?.toggleFavorite === "function") {
        await fav.toggleFavorite(hospitalId);
      } else if (typeof fav?.toggle === "function") {
        await fav.toggle(hospitalId);
      } else if (typeof fav?.upsertDelete === "function") {
        await fav.upsertDelete(hospitalId);
      }
      if (typeof fav?.refresh === "function") await fav.refresh();
    } catch (e) {
      // 失敗時は元に戻す
      setActive((prev) => !prev);
      console.error("[favorite] toggle error", e);
      alert("検討リストの更新に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label="検討に追加"
      className={`px-3 py-1.5 rounded border text-sm flex itemsセンター gap-1 transition-colors ${
        active
          ? "bg-red-50 text-red-600 border-red-300"
          : "hover:bg-gray-50 text-gray-700 border-gray-300"
      } ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
      title={active ? "検討中（クリックで外す）" : "検討に追加"}
    >
      <Heart
        className="w-4 h-4"
        color={active ? "#ef4444" : "#666"}
        fill={active ? "#ef4444" : "transparent"}
      />
      {active ? "検討中" : "検討に追加"}
    </button>
  );
}