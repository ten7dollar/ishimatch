"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type HospitalRow = {
  id: string;
  name: string;
  region: string | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  duty_frequency: string | null;       // "~2回" | "3~4回" | "5回以上" | "特になし" 等
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  bonus: string | null;
  housing_allowance: boolean | null;
  overtime_allowance: boolean | null;
  commute_allowance: boolean | null;
  pr_highlights: string | null;
};

export default function StudentHospitalDetail() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [row, setRow] = useState<HospitalRow | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select(
          "id,name,region,prefecture,city,address,website_url,facility_type,bed_count,residents_first_year,duty_frequency,salary_1st_year_min,salary_1st_year_max,bonus,housing_allowance,overtime_allowance,commute_allowance,pr_highlights"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) console.error("[detail] load error", error.message);
      setRow((data as HospitalRow) ?? null);
    })();
  }, [id, supabase]);

  if (!row) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6">
        <p className="text-sm text-gray-600">病院情報を読み込んでいます…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-8">
      {/* Hero（画像は仮置き） */}
      <section className="rounded-xl overflow-hidden border">
        <Image
          src="/images/hero-hospital.jpg"
          alt={row.name}
          width={1200}
          height={360}
          className="object-cover w-full h-60"
        />
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t">
          <div>
            <h1 className="text-xl font-semibold text-primary-700">{row.name}</h1>
            <p className="text-sm text-text-muted">
              {row.prefecture ?? "—"}・{row.city ?? "—"}（{row.region ?? "—"}）
            </p>
          </div>
          <div className="flex gap-2">
            {row.website_url && (
              <a
                href={row.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                公式サイト
              </a>
            )}
            <Link
              href="/student/saved"
              className="border border-primary-500 text-primary-600 rounded-md px-3 py-1.5 text-sm hover:bg-primary-50 transition"
            >
              検討リストを開く
            </Link>
          </div>
        </div>
      </section>

      {/* 概要 */}
      <section className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary-700">病院概要</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="text-text-muted">所在地：</span>{row.address ?? "—"}</p>
          <p><span className="text-text-muted">救急区分：</span>{row.facility_type ?? "—"}</p>
          <p><span className="text-text-muted">病床数：</span>{row.bed_count ?? "—"}</p>
          <p><span className="text-text-muted">研修医数（1年目）：</span>{row.residents_first_year ?? "—"}</p>
          <p><span className="text-text-muted">当直：</span>{row.duty_frequency ?? "—"}</p>
        </div>
      </section>

      {/* PRハイライト */}
      {row.pr_highlights && (
        <section className="card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-primary-700">PRハイライト</h2>
          <p className="text-sm text-text whitespace-pre-wrap">{row.pr_highlights}</p>
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