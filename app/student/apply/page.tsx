"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";

type Hospital = { id:string; name:string };

const HOSPITAL_APPS_KEY = "ishimatch:hospital:applications"; // 病院側 応募管理
const STUDENT_APPS_KEY  = "ishimatch:student:applications";  // ★ 学生側 応募履歴

export default function ApplyPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const hospitalId = sp.get("hospitalId") || "";

  const hospital: Hospital | null = useMemo(() => {
    if (!hospitalId) return null;
    return getMockHospital(hospitalId);
  }, [hospitalId]);

  // チェックリスト（基本情報 → 志望動機 → レジュメ）
  const [profileOk, setProfileOk]       = useState(false);
  const [motivationOk, setMotivationOk] = useState(false);
  const [resumeOk, setResumeOk]         = useState(false);

  const [file, setFile]   = useState<File | null>(null);
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);

  const disabled = !hospital || !profileOk || !motivationOk || !resumeOk || !file || busy;

  // 応募レコード生成（MVP: localStorage）
  const handleSend = async () => {
    if (disabled || !hospital) return;
    try {
      setBusy(true);

      // プロフィール（将来 Supabase から取得）
      let profile: any = {};
      try { profile = JSON.parse(localStorage.getItem("ishimatch:student:profile") || "{}"); } catch {}
      const studentName  = profile?.name      || "山田太郎";
      const studentEmail = profile?.email     || "student@example.com";
      const gradYear     = Number(profile?.gradYear || 2026);
      const university   = profile?.university || "東京大学医学部";

      const nowIso = new Date().toISOString();
      const id     = `a-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

      // 1) 病院側 応募管理に追加
      const rawH = localStorage.getItem(HOSPITAL_APPS_KEY);
      const appsH = rawH ? (JSON.parse(rawH) as any[]) : [];
      appsH.push({
        id,
        studentId: `st-${Math.random().toString(36).slice(2, 8)}`,
        studentName,
        university,
        gradYear,
        appliedAt: nowIso,
        status: "新規",
        email: studentEmail,
        // file は MVP では保存しない（将来 API に切り替え）
      });
      localStorage.setItem(HOSPITAL_APPS_KEY, JSON.stringify(appsH));

      // 2) ★ 学生側 応募履歴に追加
      const rawS = localStorage.getItem(STUDENT_APPS_KEY);
      const appsS = rawS ? (JSON.parse(rawS) as any[]) : [];
      appsS.push({
        id,                         // 同じ応募ID
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        appliedAt: nowIso,
        status: "申込済み",          // 学生側表示用のラベル
      });
      localStorage.setItem(STUDENT_APPS_KEY, JSON.stringify(appsS));

      setDone(true);

      // 3) 応募履歴へ遷移（成功トーストを出すならクエリで）
      router.push("/student/applications?added=1");
    } finally {
      setBusy(false);
    }
  };

  if (!hospital) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">初回面談を申し込む</h1>
        <p className="text-gray-600">病院が見つかりませんでした。検索ページから選び直してください。</p>
        <Link href="/student/browse" className="text-primary-600 underline">病院を探すへ戻る</Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">初回面談を申し込む</h1>
      <p className="text-gray-600">{hospital.name} への初回面談申し込み</p>

      {/* 病院カード（HCIスコア削除） */}
      <section className="rounded-xl border bg-white p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary-600 text-white flex items-center justify-center font-semibold">
          {hospital.name.slice(0, 2)}
        </div>
        <div>
          <div className="font-semibold text-primary-700">{hospital.name}</div>
        </div>
      </section>

      {/* チェックリスト（基本情報 → 志望動機 → レジュメ） */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-primary-700">申し込み前のチェックリスト</h2>

        <div className="rounded-md border bg-green-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profileOk} onChange={()=>setProfileOk(!profileOk)} />
            基本情報は登録されていますか？（氏名・メール・卒業年）
          </label>
        </div>

        <div className="rounded-md border bg-blue-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={motivationOk} onChange={()=>setMotivationOk(!motivationOk)} />
            志望動機の内容を確認しましたか？（病院ごとに内容を見直しましょう）
          </label>
        </div>

        <div className="rounded-md border bg-amber-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={resumeOk} onChange={()=>setResumeOk(!resumeOk)} />
            レジュメは入力済み／PDF化できていますか？
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input type="file" accept="application/pdf" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
            {file && <span className="text-xs text-gray-600">{file.name}</span>}
          </div>
        </div>
      </section>

      {/* 送信 */}
      <div className="text-right">
        <button
          onClick={handleSend}
          disabled={disabled}
          className={`px-5 py-2 rounded text-white ${disabled ? "bg-gray-300" : "bg-primary-600 hover:bg-primary-700"}`}
        >
          {busy ? "送信中..." : "申し込む"}
        </button>
      </div>

      {done && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-green-800">
          送信しました。病院からの連絡をお待ちください。
        </div>
      )}
    </main>
  );
}

function getMockHospital(id: string): Hospital {
  return { id, name: "東京中央医療センター" };
}