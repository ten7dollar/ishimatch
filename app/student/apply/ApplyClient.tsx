"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

// 既存MVP: ローカル保存キー（併用）
const HOSPITAL_APPS_KEY = "ishimatch:hospital:applications";
const STUDENT_APPS_KEY = "ishimatch:student:applications";

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

  // チェックリスト（UI表示のみ）
  const [profileOk, setProfileOk] = useState(false);
  const [motivationOk, setMotivationOk] = useState(false);

  // 病院へのメッセージ
  const [message, setMessage] = useState("");
  const maxMessageLength = 400;

  const [busy, setBusy] = useState(false);

  // 学生情報の取得（DB → auth.metadata → localStorage）
  async function loadStudentProfile(): Promise<StudentProfile> {
    let name = "", email = "", university = "", gradYear: number | undefined = undefined;

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      name = name || local?.name || "";
      email = email || local?.email || "";
      university = university || local?.university || "";
      gradYear = gradYear ?? (local?.gradYear ? Number(local.gradYear) : undefined);
    } catch {}
    return { name, email, university, gradYear };
  }

  // 申込送信
  const handleSend = async () => {
    if (!hospital || busy) return;
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインが必要です。");
        return;
      }

      const trimmedMessage = message.trim().slice(0, maxMessageLength);

      // 公開ID → 病院アカウントIDの解決（必ず hospital_accounts.id を FK として使う）
      const { data: acc, error: accErr } = await supabase
        .from("hospital_accounts")
        .select("id")
        .eq("hospital_id", hospital.id)
        .maybeSingle();

      if (accErr) {
        console.error("[apply] hospital_accounts lookup error:", accErr.message);
        alert("この病院への申込み設定に問題があります。時間をおいて再度お試しください。");
        return;
      }

      if (!acc?.id) {
        alert(
          "この病院は、まだオンライン申込みの受付設定が完了していません。別の病院をお選びいただくか、運営までお問い合わせください。"
        );
        return;
      }

      const targetHospitalAccountId = acc.id as string;

      // hospital_applications に INSERT
      const res = await supabase
        .from("hospital_applications")
        .insert({
          hospital_id: targetHospitalAccountId,
          student_id: user.id,
          status: "new",
          message: trimmedMessage || null,
        })
        .select("id")
        .single();

      if (res.error) throw res.error;

      // 旧MVP互換（localStorage）
      try {
        const nowIso = new Date().toISOString();
        const profile = await loadStudentProfile();
        const applicationId =
          res.data?.id ??
          `a-${crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

        // 病院側ローカル
        const rawH = localStorage.getItem(HOSPITAL_APPS_KEY);
        const appsH = rawH ? JSON.parse(rawH) : [];
        appsH.push({
          id: applicationId,
          studentId: user.id,
          studentName: profile.name || "（氏名未設定）",
          university: profile.university || "",
          gradYear: profile.gradYear ?? null,
          appliedAt: nowIso,
          status: "新規",
          email: profile.email || "",
          message: trimmedMessage || "",
        });
        localStorage.setItem(HOSPITAL_APPS_KEY, JSON.stringify(appsH));

        // 学生側ローカル
        const rawS = localStorage.getItem(STUDENT_APPS_KEY);
        const appsS = rawS ? JSON.parse(rawS) : [];
        appsS.push({
          id: applicationId,
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          appliedAt: nowIso,
          status: "申込済み",
          source: "self",
        });
        localStorage.setItem(STUDENT_APPS_KEY, JSON.stringify(appsS));
      } catch {}

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
        <p className="text-gray-600">
          病院が見つかりませんでした。検索ページから選び直してください。
        </p>
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
          <input
            type="checkbox"
            checked={profileOk}
            onChange={() => setProfileOk(!profileOk)}
          />
          基本情報は登録されていますか？（氏名・メール・卒業年）
        </label>
        <label className="flex gap-2 items-center text-sm">
          <input
            type="checkbox"
            checked={motivationOk}
            onChange={() => setMotivationOk(!motivationOk)}
          />
          志望動機・自己紹介の内容を確認しましたか？
        </label>
        <p className="text-xs text-gray-500">
          チェックは任意ですが、事前に内容を整理してから申し込むことをおすすめします。
        </p>
      </section>

      {/* 病院へのメッセージ */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-primary-700">病院へのメッセージ（任意）</h2>
        <p className="text-xs text-gray-500">
          志望理由や、見学・面談で特に聞きたいことなどを自由に記入してください（400字程度）。
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxMessageLength))}
          rows={6}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary-200"
          placeholder="例）貴院の救急医療に関する研修内容に強く興味があります。..."
        />
        <div className="text-right text-xs text-gray-500">
          {message.length}/{maxMessageLength} 文字
        </div>
      </section>

      {/* 送信 */}
      <div className="text-right">
        <button
          onClick={handleSend}
          disabled={busy}
          className={`px-5 py-2 rounded text-white ${
            busy
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-primary-600 hover:bg-primary-700"
          }`}
        >
          {busy ? "送信中..." : "申し込む"}
        </button>
      </div>
    </main>
  );
}