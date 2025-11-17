"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

// 既存MVP: ローカル保存キー（併用）
const HOSPITAL_APPS_KEY = "ishimatch:hospital:applications";
const STUDENT_APPS_KEY  = "ishimatch:student:applications";

// 画面で使う最小型
type HospitalRow = { id: string; name: string };
type StudentProfile = { name: string; email: string; university?: string; gradYear?: number };

export default function ApplyClient() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // クエリから hospitalId
  const [hospitalId, setHospitalId] = useState<string>("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("hospitalId") || "";
    setHospitalId(id);
  }, []);

  // 病院（公開参照は hospitals_resolved）
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      const { data, error } = await supabase
        .from("hospitals_resolved")
        .select("id,name")
        .eq("id", hospitalId)
        .maybeSingle();
      if (error) console.warn("[apply] load hospital error:", error.message);
      setHospital((data as HospitalRow) ?? null);
    })();
  }, [supabase, hospitalId]);

  // チェックリスト（UIは維持。ただし必須では止めない）
  const [profileOk, setProfileOk]       = useState(false);
  const [motivationOk, setMotivationOk] = useState(false);
  const [resumeOk, setResumeOk]         = useState(false);
  const [file, setFile]                 = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // 学生情報の取得（DB → auth.metadata → localStorage）
  async function loadStudentProfile(): Promise<StudentProfile> {
    let name = "", email = "", university = "", gradYear: number | undefined = undefined;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      email = user.email ?? "";
      name =
        (user.user_metadata?.full_name as string) ??
        (user.user_metadata?.name as string) ??
        "";

      const { data: s } = await supabase
        .from("students")
        .select("name,email,university,grad_year")
        .eq("id", user.id)
        .maybeSingle();

      if (s) {
        name = s.name ?? name;
        email = s.email ?? email;
        university = s.university ?? university;
        gradYear = (s.grad_year ?? undefined) as number | undefined;
      }
    }

    try {
      const local = JSON.parse(localStorage.getItem("ishimatch:student:profile") || "{}");
      name       = name       || local?.name || "";
      email      = email      || local?.email || "";
      university = university || local?.university || "";
      gradYear   = gradYear   ?? (local?.gradYear ? Number(local.gradYear) : undefined);
    } catch {}
    return { name, email, university, gradYear };
  }

  // 申込送信
  const handleSend = async () => {
    if (!hospital || busy) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインが必要です。");
        return;
      }

      // 公開ID → 病院アカウントIDの解決
      let targetHospitalAccountId: string | null = null;

      // 1) hospital_accounts.hospital_id = 公開ID で紐付けを探す
      const { data: acc } = await supabase
        .from("hospital_accounts")
        .select("id")
        .eq("hospital_id", hospital.id)
        .maybeSingle();
      if (acc?.id) targetHospitalAccountId = acc.id;

      // 2) 見つからない場合は “公開ID = アカウントID” 前提で試す（claim済み想定）
      if (!targetHospitalAccountId) targetHospitalAccountId = hospital.id;

      // 3) RLS: 学生が自分の student_id で INSERT できるように
      const res = await supabase
        .from("hospital_applications")
        .insert({
          hospital_id: targetHospitalAccountId,  // ← 病院アカウントIDに合わせる
          student_id : user.id,
          status     : "new",
        })
        .select("id")
        .single();

      if (res.error) throw res.error;

      // 旧MVP互換（localStorage）
      try {
        const nowIso = new Date().toISOString();
        const profile = await loadStudentProfile();
        const applicationId = res.data?.id ?? `a-${crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

        // 病院側
        const rawH = localStorage.getItem(HOSPITAL_APPS_KEY);
        const appsH = rawH ? JSON.parse(rawH) : [];
        appsH.push({
          id: applicationId,
          studentId: user.id,
          studentName: profile.name || "（氏名未設定）",
          university: profile.university || "",
          gradYear  : profile.gradYear ?? null,
          appliedAt : nowIso,
          status    : "新規",
          email     : profile.email || "",
        });
        localStorage.setItem(HOSPITAL_APPS_KEY, JSON.stringify(appsH));

        // 学生側
        const rawS = localStorage.getItem(STUDENT_APPS_KEY);
        const appsS = rawS ? JSON.parse(rawS) : [];
        appsS.push({
          id: applicationId,
          hospitalId  : hospital.id,
          hospitalName: hospital.name,
          appliedAt   : nowIso,
          status      : "申込済み",
          source      : "self",
        });
        localStorage.setItem(STUDENT_APPS_KEY, JSON.stringify(appsS));
      } catch {}

      setDone(true);
      location.href = "/student/applications?added=1";
    } catch (e: any) {
      console.error("[apply] send error", e?.message);
      alert(`送信に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  if (!hospital) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">初回面談を申し込む</h1>
        <p className="text-gray-600">病院が見つかりませんでした。検索ページから選び直してください。</p>
        <Link href="/student/browse" className="text-primary-600 underline">
          病院を探すへ戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">初回面談を申し込む</h1>
      <p className="text-gray-600">{hospital.name} への初回面談申し込み</p>

      {/* 病院カード */}
      <section className="rounded-xl border bg-white p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary-600 text-white flex items-center justify-center font-semibold">
          {hospital.name.slice(0, 2)}
        </div>
        <div className="font-semibold text-primary-700">{hospital.name}</div>
      </section>

      {/* チェックリスト（UI表示のみ） */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-primary-700">申し込み前のチェックリスト</h2>
        <label className="flex gap-2 items-center text-sm">
          <input type="checkbox" checked={profileOk} onChange={() => setProfileOk(!profileOk)} />
          基本情報は登録されていますか？（氏名・メール・卒業年）
        </label>
        <label className="flex gap-2 items-center text-sm">
          <input type="checkbox" checked={motivationOk} onChange={() => setMotivationOk(!motivationOk)} />
          志望動機の内容を確認しましたか？
        </label>
        <label className="flex gap-2 items-center text-sm">
          <input type="checkbox" checked={resumeOk} onChange={() => setResumeOk(!resumeOk)} />
          レジュメはPDF化できていますか？
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input type="file" accept="application/pdf" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          {file && <span className="text-xs text-gray-600">{file.name}</span>}
        </div>
      </section>

      {/* 送信 */}
      <div className="text-right">
        <button
          onClick={handleSend}
          disabled={busy}
          className={`px-5 py-2 rounded text-white ${busy ? "bg-gray-300" : "bg-primary-600 hover:bg-primary-700"}`}
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