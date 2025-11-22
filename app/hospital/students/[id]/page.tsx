"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import StudentDocuments from "./_components/StudentDocuments";

import {
  useFavoriteStudents,
  type FavStudent,
} from "../../_providers/favorite-students";

/* ----------------------------------------------------
   Supabase: students の型
---------------------------------------------------- */
type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  university: string | null;
  grad_year: number | null;
  created_at: string | null;

  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  gender: string | null;
  birthdate: string | null;
  faculty: string | null;
  phone: string | null;

  region: string | null;
  prefecture: string | null;

  duty_preference: string | null; // "可能" | "相談" | "不可" 等
  desired_salary_min: number | null;
  major: string | null;           // CSV想定

  avatar_url: string | null;

  updated_at: string | null;
};

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : ((params?.id as string) || "");

  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [row, setRow] = useState<StudentRow | null>(null);
  const [loading, setLoading] = useState(true);

  const { isFavorite, toggleFavorite } = useFavoriteStudents();

  /** avatars は public 運用のため getPublicUrl でOK */
  function buildAvatarUrl(avatarPath: string | null): string | undefined {
    if (!avatarPath) return undefined;
    const clean = avatarPath.replace(/^\//, "");
    const { data } = supabase.storage.from("avatars").getPublicUrl(clean);
    return data?.publicUrl || undefined;
  }

  /** 学生詳細の読み込み */
  useEffect(() => {
    (async () => {
      if (!idParam) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("id", idParam)
          .maybeSingle();
        if (error) throw error;
        setRow((data as StudentRow) ?? null);
      } catch (e) {
        console.error("[hospital/students/[id]] load error:", e);
        setRow(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, idParam]);

  /** 表示用に正規化 */
  const display = useMemo(() => {
    if (!row) return null;

    const displayName =
      row.name ||
      `${row.last_name ?? ""} ${row.first_name ?? ""}`.trim() ||
      "（氏名未登録）";

    const gradYearStr =
      row.grad_year != null ? String(row.grad_year) : undefined;

    const desiredSalaryText =
      row.desired_salary_min != null
        ? `${row.desired_salary_min}万円以上`
        : "—";

    const majors =
      row.major?.split(/[、,]/).map((s) => s.trim()).filter(Boolean) ?? [];

    const areaText = row.prefecture || row.region || "—";

    return {
      id: row.id,
      displayName,
      university: row.university ?? "—",
      gradYearStr,
      areaText,
      majors,
      desiredSalaryText,
      duty: row.duty_preference ?? "—",
      email: row.email ?? "",
      phone: row.phone ?? "",
      avatarUrl: buildAvatarUrl(row.avatar_url),
      selfPr: "自己PRはまだ登録されていません。", // 将来 students 側の PR カラムへ差し替え
    };
  }, [row]);

  /** お気に入りトグル */
  const onToggleFavorite = () => {
    if (!row || !display) return;
    const payload: FavStudent = {
      id: row.id,
      name: display.displayName,
      university: display.university,
      gradYear: display.gradYearStr ?? "",
    };
    toggleFavorite(payload);
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6">
        <p className="text-gray-600">読み込み中…</p>
      </main>
    );
  }

  if (!row || !display) {
    return (
      <main className="max-w-5xl mx-auto px-8 py-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-primary-600 text-sm hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          戻る
        </button>
        <h1 className="text-xl font-semibold">学生プロフィール</h1>
        <p className="text-text-muted text-sm">該当の学生が見つかりませんでした。</p>
      </main>
    );
  }

  const isFav = isFavorite(display.id);

  return (
    <main className="max-w-5xl mx-auto px-8 py-6 space-y-8">
      {/* 戻る */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-primary-600 text-sm hover:underline"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        戻る
      </button>

      <h1 className="text-xl font-semibold">学生プロフィール</h1>
      <p className="text-text-muted text-sm">{display.displayName} さんの詳細情報</p>

      {/* ===== ヘッダー（アバター・基本情報・アクション） ===== */}
      <section className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-6">
          {/* 左：アバター＋基本情報 */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
              {display.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={display.avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                display.displayName.slice(0, 2)
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">{display.displayName}</h2>
              <p className="text-text-muted text-sm">{display.university}</p>
              <div className="flex gap-4 text-sm text-text-muted">
                <span>卒業予定：{display.gradYearStr ?? "—"}年</span>
                <span>希望勤務地：{display.areaText}</span>
                <span>
                  志望科：{display.majors.length > 0 ? display.majors.join("、") : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 右：アクション */}
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/hospital/scouts/new?studentId=${encodeURIComponent(display.id)}`}
              className="px-3 py-2 rounded bg-primary-600 text-white text-sm hover:bg-primary-700 transition"
            >
              スカウトを送る
            </Link>
            <button
              onClick={onToggleFavorite}
              className={`px-3 py-2 rounded border text-sm hover:bg-gray-50 transition ${
                isFav ? "border-primary-500 text-primary-600" : ""
              }`}
              title={isFav ? "お気に入り解除" : "お気に入りに追加"}
            >
              {isFav ? "お気に入り解除" : "お気に入りに追加する"}
            </button>
          </div>
        </div>
      </section>

      {/* ===== 自己PR ===== */}
      <section className="card p-6 space-y-4">
        <h3 className="text-primary-700 font-semibold">自己PR・志望動機</h3>
        <p className="text-text text-sm">{display.selfPr}</p>
      </section>

      {/* ===== 希望条件 ===== */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2 text-sm">
          <h4 className="font-semibold text-primary-700">希望条件</h4>
          <p>
            <span className="font-medium">希望勤務地：</span>
            {display.areaText}
          </p>
          <p>
            <span className="font-medium">志望診療科：</span>
            {display.majors.length > 0 ? display.majors.join("、") : "—"}
          </p>
          <p>
            <span className="font-medium">希望年収：</span>
            {display.desiredSalaryText}
          </p>
        </div>
        <div className="card p-4 space-y-2 text-sm">
          <h4 className="font-semibold text-primary-700">勤務希望</h4>
          <p>
            <span className="font-medium">当直可否：</span>
            {display.duty}
          </p>
          <p>
            <span className="font-medium">メール：</span>
            {display.email || "—"}
          </p>
          <p>
            <span className="font-medium">電話：</span>
            {display.phone || "—"}
          </p>
        </div>
      </section>

      {/* ===== 提出書類（閲覧のみ） ===== */}
      <StudentDocuments studentId={display.id} />
    </main>
  );
}