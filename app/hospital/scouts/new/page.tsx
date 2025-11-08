"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useScoutsOutbox } from "../../_providers/scout-outbox";

const MAX = 400;

type StudentDetail = {
  id: string;
  name: string;
  email?: string;
  university: string;
  gradYear: string;
  area: string[];
  major: string[];
  desiredSalary: string;
  duty: "可能" | "相談" | "不可";
  pr: string;
};

export default function ScoutSendPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const studentId = sp.get("studentId") || "";

  // 送信先学生（本番はAPIで studentId から取得）
  const student: StudentDetail | null = useMemo(() => {
    if (!studentId) return null;
    return getMockStudent(studentId);
  }, [studentId]);

  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const { sendScout } = useScoutsOutbox();

  useEffect(() => {
    setCount(message.length);
  }, [message]);

  const disabled = !student || count === 0 || count > MAX || busy;

  const handleSend = async () => {
    if (disabled || !student) return;
    try {
      setBusy(true);
      // MVP：送付履歴として学生情報のみ登録（本文は保存しない）
      sendScout({
        studentId: student.id,
        studentName: student.name,
        university: student.university,
        gradYear: student.gradYear,
      });
      alert(`「${student.name}」へスカウトを送信しました`);
      router.push("/hospital/scouts");
    } finally {
      setBusy(false);
    }
  };

  if (!student) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">スカウト送信</h1>
        <p className="text-gray-600">学生にスカウトメッセージを送信します</p>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-gray-600">studentId が指定されていないため、送信先が見つかりませんでした。</p>
          <div className="mt-3">
            <Link href="/hospital/students" className="text-primary-600 underline">
              学生検索へ戻る
            </Link>
          </div>
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
              <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
                {student.name.slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold">{student.name}</div>
                <div className="text-gray-600">{student.university}・{student.gradYear}年卒</div>
              </div>
            </div>

            {student.email && (
              <div className="mt-2 text-gray-700">
                <span className="text-gray-500 mr-2">メール</span>{student.email}
              </div>
            )}

            <div className="mt-2 grid grid-cols-1 gap-1 text-gray-700">
              <div><span className="text-gray-500">志望診療科：</span>{student.major.join("、")}</div>
              <div><span className="text-gray-500">希望エリア：</span>{student.area.join("、")}</div>
              <div><span className="text-gray-500">希望年収：</span>{student.desiredSalary}</div>
              <div><span className="text-gray-500">当直：</span>{student.duty}</div>
            </div>

            <div className="mt-3 rounded border bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {student.pr}
            </div>

            <div className="mt-3">
              <Link
                href={`/hospital/students/${encodeURIComponent(student.id)}`}
                className="w-full inline-flex justify-center px-3 py-2 border rounded text-sm hover:bg-primary-50 transition"
              >
                詳細プロフィールを見る
              </Link>
            </div>
          </div>
        </section>

        {/* メッセージ本文 */}
        <section className="rounded-xl border bg-white p-6 space-y-4">
          <h2 className="font-semibold text-primary-700">スカウトメッセージ</h2>
          <p className="text-sm text-gray-600">学生に送信するメッセージを入力してください</p>

          <div>
            <label className="text-sm text-gray-600">メッセージ本文*</label>
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
              <li>学生のプロフィールを確認し、具体的にマッチする点を伝える</li>
              <li>病院の特徴や強みを簡潔に説明する</li>
              <li>次のアクション（見学、面談など）を明確にする</li>
              <li>丁寧で親しみやすい文体を心がける</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded border text-sm"
            >
              キャンセル
            </button>
            <button
              onClick={handleSend}
              disabled={disabled}
              className={`px-4 py-2 rounded text-sm ${disabled ? "bg-gray-300 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              スカウトを送信
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ダミー取得：本番は API/DB に置き換え */
function getMockStudent(id: string): StudentDetail {
  return {
    id,
    name: "山田太郎",
    email: "yamada@example.com",
    university: "東京大学医学部",
    gradYear: "2026",
    area: ["東京都", "神奈川県"],
    major: ["救急科", "内科"],
    desiredSalary: "500万円以上",
    duty: "可能",
    pr: "救急医療に強い関心があり、初期研修では幅広い症例を経験したいと考えています。ACLSも取得済みです。",
  };
}