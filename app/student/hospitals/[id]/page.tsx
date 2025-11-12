"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** hospitals の行 */
type HospitalRow = {
  id: string;
  name: string;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  duty_frequency: "~2回" | "3~4回" | "5回以上" | "特になし";
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  bonus: string | null;
  housing_allowance: boolean | null;
  overtime_allowance: boolean | null;
  commute_allowance: boolean | null;
  // 任意: 画像カラムが無いのでプレースホルダ利用
};

export default function StudentHospitalDetail() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [row, setRow] = useState<HospitalRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!idParam) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("hospitals").select("*").eq("id", idParam).maybeSingle();
      if (!error) setRow((data as HospitalRow) ?? null);
      setLoading(false);
    })();
  }, [idParam, supabase]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-10">
        <p className="text-gray-500">読み込み中…</p>
      </main>
    );
  }
  if (!row) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-10">
        <p className="text-gray-500">病院が見つかりませんでした。</p>
        <Link href="/student/browse" className="underline text-primary-600">検索に戻る</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-10">
      {/* Hero（画像カラムが無いので色ブロック＋名前を表示） */}
      <section className="rounded-xl overflow-hidden border bg-gray-50">
        <div className="w-full h-48 relative">
          {/* 任意で差し替え可 */}
          <Image src="/images/hero-hospital.jpg" alt={row.name} fill className="object-cover opacity-70" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t">
          <div className="flex items-center gap-4">
            <Image src="/images/hospital-logo.png" alt="logo" width={56} height={56} className="rounded-md border" />
            <div>
              <h1 className="text-xl font-semibold text-primary-700">{row.name}</h1>
              <p className="text-sm text-text-muted">
                {row.prefecture ?? "—"}・{row.city ?? "—"}
              </p>
            </div>
          </div>

          <FavButton hospitalId={row.id} />
        </div>
      </section>

      {/* 概要 */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="text-text-muted">所在地：</span>{row.address ?? "—"}</p>
          <p><span className="text-text-muted">救急区分：</span>{row.facility_type ?? "—"}</p>
          <p><span className="text-text-muted">病床数：</span>{row.bed_count ?? "—"}</p>
          <p><span className="text-text-muted">初期研修医：</span>{row.residents_first_year ?? "—"}</p>
        </div>
      </section>

      {/* 特色（簡易） */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">処遇・特色（抜粋）</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="text-text-muted">年収：</span>
            {row.salary_1st_year_min ? `${row.salary_1st_year_min}万〜${row.salary_1st_year_max ?? "—"}万` : "—"}
          </p>
          <p><span className="text-text-muted">当直：</span>{row.duty_frequency ?? "—"}</p>
          <p><span className="text-text-muted">賞与：</span>{row.bonus ?? "—"}</p>
          <p><span className="text-text-muted">住宅手当：</span>{row.housing_allowance ? "あり" : "—"}</p>
        </div>
        {row.website_url && (
          <p className="text-sm">
            公式サイト：
            <a href={row.website_url} target="_blank" className="underline text-primary-600">
              {row.website_url}
            </a>
          </p>
        )}
      </section>

      {/* CTA */}
      <div className="flex gap-3 justify-end">
        <Link href="/student/saved" className="border border-primary-500 text-primary-600 rounded-md px-4 py-2 hover:bg-primary-50 transition">
          検討リストを開く
        </Link>
        <Link href={`/student/apply?hospitalId=${encodeURIComponent(row.id)}`} className="bg-primary-500 text-white rounded-md px-4 py-2 hover:bg-primary-600 transition">
          初回面談を申し込む
        </Link>
      </div>
    </main>
  );
}

/* --- 検討トグル（DB 永続） --- */
function FavButton({ hospitalId }: { hospitalId: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("student_favorites")
        .select("hospital_id")
        .eq("student_id", user.id)
        .eq("hospital_id", hospitalId)
        .maybeSingle();
      setActive(!!data);
    })();
  }, [hospitalId, supabase]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (active) {
        await supabase.from("student_favorites").delete().eq("student_id", user.id).eq("hospital_id", hospitalId);
        setActive(false);
      } else {
        await supabase.from("student_favorites").upsert({ student_id: user.id, hospital_id: hospitalId });
        setActive(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`px-3 py-1 text-sm rounded border ${active ? "bg-red-50 text-red-600 border-red-300" : ""}`}
    >
      {active ? "★ 検討中" : "☆ 検討に追加"}
    </button>
  );
}