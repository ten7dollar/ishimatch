"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

// 病院側お気に入り（学生）
import {
  useFavoriteStudents,
  type FavStudent,
} from "../../_providers/favorite-students";

// 追加：病院で学生の提出書類を閲覧するコンポーネント
import StudentDocuments from "./_components/StudentDocuments";

/* ----------------------------------------------------
   Supabase: students の型（あなたのスキーマに合わせる）
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

  duty_preference: string | null; // "可能" | "相談" | "不可"
  desired_salary_min: number | null;
  major: string | null;

  avatar_url: string | null;
  transcript_url: string | null;
  certificate_url: string | null;

  updated_at: string | null;
};

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const idParam =
    Array.isArray(params?.id) ? params.id[0] : ((params?.id as string) || "");

  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [row, setRow] = useState<StudentRow | null>(null);
  const [loading, setLoading] = useState(true);

  // お気に入り（病院側）
  const { isFavorite, toggleFavorite } = useFavoriteStudents();

  // 読み込み
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

  // 表示用に整形
  const display = useMemo(() => {
    if (!row) return null;

    const displayName =
      row.name ||
      `${row.last_name ?? ""} ${row.first_name ?? ""}`.trim() ||
      "（氏名未登録）";

    const gradYearStr = row.grad_year != null ? String(row.grad_year) : undefined;

    const desiredSalaryText =
      row.desired_salary_min != null ? `${row.desired_salary_min}万円以上` : "—";

    const majors =
      row.major?.split(/[、,]/).map((s) => s.trim()).filter(Boolean) ?? [];

    const areaText = row.prefecture || row.region || "—";

    const selfPr = "自己PRはまだ登録されていません。";

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
      selfPr,
    };
  }, [row]);

  // お気に入りトグル
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

      {/* ── ヘッダーカード（右：アクション2ボタン） ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-6">
          {/* 左：基本情報 */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold">
              {display.displayName.slice(0, 2)}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">{display.displayName}</h2>
              <p className="text-text-muted text-sm">{display.university}</p>
              <div className="flex gap-4 text-sm text-text-muted">
                <span>卒業予定：{display.gradYearStr ?? "—"}年</span>
                <span>希望勤務地：{display.areaText}</span>
                <span>志望科：{display.majors.length > 0 ? display.majors.join("、") : "—"}</span>
              </div>
            </div>
          </div>

          {/* 右：アクション 2ボタン */}
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

      {/* 自己PR（簡易） */}
      <section className="card p-6 space-y-4">
        <h3 className="text-primary-700 font-semibold">自己PR・志望動機</h3>
        <p className="text-text text-sm">{display.selfPr}</p>
      </section>

      {/* 希望条件（必要項目に絞って表示） */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2 text-sm">
          <h4 className="font-semibold text-primary-700">希望条件</h4>
          <p><span className="font-medium">希望勤務地：</span>{display.areaText}</p>
          <p><span className="font-medium">志望診療科：</span>{display.majors.length > 0 ? display.majors.join("、") : "—"}</p>
          <p><span className="font-medium">希望年収：</span>{display.desiredSalaryText}</p>
        </div>

        <div className="card p-4 space-y-2 text-sm">
          <h4 className="font-semibold text-primary-700">勤務希望</h4>
          <p><span className="font-medium">当直可否：</span>{display.duty}</p>
          <p><span className="font-medium">メール：</span>{display.email || "—"}</p>
          <p><span className="font-medium">電話：</span>{display.phone || "—"}</p>
        </div>
      </section>

      {/* 提出書類（署名付きURLで安全に閲覧） */}
      <section className="card p-6 space-y-3">
        <h3 className="text-primary-700 font-semibold">提出書類</h3>
        <StudentDocuments studentId={display.id} />
      </section>

      {/* 🗒️ 仕様変更：スコア/活動履歴は非表示に */}
    </main>
  );
}