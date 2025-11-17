"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

// ★ このページはサーバーでの事前レンダリングをやめてCSRにする（ビルド安定化）
export const dynamic = "force-dynamic";

const MAX = 400;

/** students から最小限取得する型 */
type StudentDetail = {
  id: string;
  name: string;
  email?: string | null;
  university?: string | null;
  grad_year?: number | null;
};

// ---- ラッパー（Suspenseで包む） ----
export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">読み込み中...</div>}>
      <ScoutSendForm />
    </Suspense>
  );
}

// ---- フォーム本体（useSearchParamsはこの中だけで使用） ----
function ScoutSendForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const studentId = sp.get("studentId") || "";

  // 送信先学生
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!studentId) {
        setStudent(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // students から最小情報を取得
        const { data, error } = await supabase
          .from("students")
          .select("id,name,email,university,grad_year")
          .eq("id", studentId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setStudent(null);
        } else {
          setStudent({
            id: data.id,
            name: data.name ?? "（氏名未登録）",
            email: data.email ?? null,
            university: data.university ?? null,
            grad_year: data.grad_year ?? null,
          });
        }
      } catch (e: any) {
        console.error("[scout-new] load student error:", e?.message || e);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, studentId]);

  // フォーム入力
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => setCount(message.length), [message]);

  const disabled = !student || loading || count === 0 || count > MAX || busy;

  // 送信
  const handleSend = async () => {
    if (disabled || !student) return;
    try {
      setBusy(true);

      // 認証チェック（= 病院の本人）
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインが必要です。");
        return;
      }
      const hospitalId = user.id;

      // scout_invitations に insert（RLS: with check auth.uid() = hospital_id）
      const { error } = await supabase
        .from("scout_invitations")
        .insert({
          hospital_id: hospitalId,
          student_id: student.id,
          status: "sent",
          message,
        })
        .select()
        .single();

      if (error) throw error;

      alert(`「${student.name}」へスカウトを送信しました`);
      router.push("/hospital/scouts");
    } catch (e: any) {
      console.error("[scout-new] send error:", e?.message || e);
      alert(`送信に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-sm text-gray-500">読み込み中…</p>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">スカウト送信</h1>
        <p className="text-gray-600">
          studentId が指定されていないか、学生が見つかりませんでした。
        </p>
        <div>
          <Link href="/hospital/students" className="text-primary-600 underline">
            学生検索へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">スカウト送信</h1>
          <p className="text-gray-600">学生にスカウトメッセージを送信します</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 送信先学生 */}
        <section className="rounded-xl border bg-white p-6 space-y-4">
          <h2 className="font-semibold text-primary-700">送信先学生</h2>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                {student.name.slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold">{student.name}</div>
                <div className="text-gray-600">
                  {student.university ?? "—"}・{student.grad_year ?? "—"}年卒
                </div>
              </div>
            </div>

            {student.email && (
              <div className="mt-2 text-gray-700">
                <span className="text-gray-500 mr-2">メール</span>
                {student.email}
              </div>
            )}
          </div>

          <div className="mt-3">
            <Link
              href={`/hospital/students/${encodeURIComponent(student.id)}`}
              className="w-full inline-flex justify-center px-3 py-2 border rounded text-sm hover:bg-primary-50 transition"
            >
              詳細プロフィールを見る
            </Link>
          </div>
        </section>

        {/* メッセージ本文 */}
        <section className="rounded-xl border bg-white p-6 space-y-4">
          <h2 className="font-semibold text-primary-700">スカウトメッセージ</h2>
          <p className="text-sm text-gray-600">学生に送信するメッセージを入力してください</p>

          <div>
            <label className="text-sm text-gray-600">メッセージ本文（最大 {MAX} 文字）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              maxLength={MAX}
              placeholder="スカウトメッセージを入力してください…"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-right text-xs text-gray-500">{count}/{MAX}文字</div>
          </div>

          <div className="rounded bg-blue-50/50 border border-blue-100 p-3 text-sm text-blue-900">
            <p className="font-semibold mb-1">効果的なスカウトメッセージのポイント：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>学生のプロフィールを踏まえた具体的な“合いそうな点”を伝える</li>
              <li>病院の特徴や強みを簡潔に説明する</li>
              <li>次のアクション（見学、面談など）を明確にする</li>
              <li>丁寧で親しみやすい文体を心がける</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => router.back()} className="px-4 py-2 rounded border text-sm">
              キャンセル
            </button>
            <button
              onClick={handleSend}
              disabled={disabled}
              className={`px-4 py-2 rounded text-sm ${disabled ? "bg-gray-300 text-white" : "bg-primary-600 text-white hover:bg-primary-700"}`}
            >
              スカウトを送信
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}