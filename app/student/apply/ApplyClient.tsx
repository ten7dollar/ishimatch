"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/* ===============================
   既存MVP: ローカル保存キー（併用）
================================= */
const HOSPITAL_APPS_KEY = "ishimatch:hospital:applications";
const STUDENT_APPS_KEY  = "ishimatch:student:applications";

/* ===============================
   表示用最小型（病院）
   ※ 学生は hospitals_resolved を参照
================================= */
type HospitalRow = {
  id: string;   // = hospitals.id
  name: string;
};

/* ===============================
   学生プロファイル（MVPフォールバック付き）
================================= */
type StudentProfile = {
  name: string;
  email: string;
  university?: string;
  gradYear?: number;
};

export default function ApplyClient() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  /* --------------------------------------------
     1) クエリから hospitalId（= hospitals.id）を読む
     （現仕様尊重：useSearchParams は使わない）
  --------------------------------------------- */
  const [hospitalId, setHospitalId] = useState<string>("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("hospitalId") || "";
    setHospitalId(id);
  }, []);

  /* --------------------------------------------
     2) 表示用の病院行を取得（hospitals_resolved）
  --------------------------------------------- */
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      const { data, error } = await supabase
        .from("hospitals_resolved")
        .select("id,name")
        .eq("id", hospitalId)
        .maybeSingle();
      if (error) console.error("[apply] fetch hospital error:", error.message);
      setHospital((data as HospitalRow) ?? null);
    })();
  }, [supabase, hospitalId]);

  /* --------------------------------------------
     3) 応募登録のための hospital_accounts.id を解決
     - hospital_accounts.hospital_id = hospitals.id
     - is_published が false のものは除外（coalesce(true)）
  --------------------------------------------- */
  const [hospitalAccountId, setHospitalAccountId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      const { data, error } = await supabase
        .from("hospital_accounts")
        .select("id")
        .eq("hospital_id", hospitalId)
        .is("deleted_at", null)               // もし論理削除などがあれば
        .eq("is_published", true)             // 公開のみ
        .maybeSingle();
      if (error) console.error("[apply] fetch hospital_account error:", error.message);
      setHospitalAccountId((data?.id as string) ?? null);
    })();
  }, [supabase, hospitalId]);

  /* --------------------------------------------
     4) チェックリスト UI（現状維持）
  --------------------------------------------- */
  const [profileOk, setProfileOk]       = useState(false);
  const [motivationOk, setMotivationOk] = useState(false);
  const [resumeOk, setResumeOk]         = useState(false);
  const [file, setFile]                 = useState<File | null>(null);
  const [busy, setBusy]                 = useState(false);
  const [done, setDone]                 = useState(false);

  const disabled =
    !hospital || !hospitalAccountId || !profileOk || !motivationOk || !resumeOk || !file || busy;

  /* --------------------------------------------
     5) Supabase から学生情報（不足は localStorage フォールバック）
  --------------------------------------------- */
  async function loadStudentProfile(): Promise<StudentProfile> {
    let name = "", email = "", university = "", gradYear: number | undefined = undefined;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      email = user.email ?? "";
      name =
        (user.user_metadata?.full_name as string) ??
        (user.user_metadata?.name as string) ??
        "";

      // students テーブル（ある場合のみ）
      const { data: s } = await supabase
        .from("students")
        .select("name, email, university, grad_year")
        .eq("id", user.id)
        .maybeSingle();

      if (s) {
        name       = s.name       ?? name;
        email      = s.email      ?? email;
        university = s.university ?? university;
        gradYear   = (s.grad_year ?? undefined) as number | undefined;
      }
    }

    // 既存MVPのフォールバック
    try {
      const local = JSON.parse(localStorage.getItem("ishimatch:student:profile") || "{}");
      name       = name       || local?.name || "";
      email      = email      || local?.email || "";
      university = university || local?.university || "";
      gradYear   = gradYear ?? (local?.gradYear ? Number(local.gradYear) : undefined);
    } catch {}

    return { name, email, university, gradYear };
  }

  /* --------------------------------------------
     6) 送信（UIはそのまま / DB + localStorage 併用）
     - DB は hospital_applications に 1 行 insert
       ※ hospital_applications.hospital_id = hospital_accounts.id
  --------------------------------------------- */
  const handleSend = async () => {
    if (disabled || !hospital || !hospitalAccountId) return;
    setBusy(true);
    try {
      // 認証チェック
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインが必要です。");
        return;
      }

      const profile = await loadStudentProfile();
      const nowIso  = new Date().toISOString();
      const applicationId = `a-${crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

      // 6-1) Supabase へ登録
      await supabase
        .from("hospital_applications")
        .insert({
          // id は UUID なら DB 側 default でもOK。明示的に入れるなら下記を使用
          id         : crypto?.randomUUID?.() ?? undefined,
          hospital_id: hospitalAccountId,   // ★ ここは hospital_accounts.id
          student_id : user.id,
          status     : "new",               // 病院側ワークフローの英字コード（例）
          source     : "self",
          created_at : nowIso,
        })
        .throwOnError();

      // 6-2) 既存MVP 互換：localStorage にも保存（画面の即時反映に使っている箇所があるため残す）
      try {
        // 病院側ダッシュ用
        const rawH  = localStorage.getItem(HOSPITAL_APPS_KEY);
        const appsH = rawH ? JSON.parse(rawH) : [];
        appsH.push({
          id         : applicationId,
          studentId  : user.id,
          studentName: profile.name || "（氏名未設定）",
          university : profile.university || "",
          gradYear   : profile.gradYear ?? null,
          appliedAt  : nowIso,
          status     : "新規",
          email      : profile.email || "",
        });
        localStorage.setItem(HOSPITAL_APPS_KEY, JSON.stringify(appsH));

        // 学生側履歴
        const rawS  = localStorage.getItem(STUDENT_APPS_KEY);
        const appsS = rawS ? JSON.parse(rawS) : [];
        appsS.push({
          id          : applicationId,
          hospitalId  : hospital.id,    // 画面遷移先で使うのは hospitals(hospitals_resolved).id
          hospitalName: hospital.name,
          appliedAt   : nowIso,
          status      : "申込済み",
          source      : "self",
        });
        localStorage.setItem(STUDENT_APPS_KEY, JSON.stringify(appsS));
      } catch {}

      setDone(true);
      // 送信後は応募履歴へ
      location.href = "/student/applications?added=1";
    } catch (e: any) {
      console.error("[apply] send error", e?.message);
      alert(`送信に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------------------
     画面
  --------------------------------------------- */
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

      {/* 病院カード（現UIのまま） */}
      <section className="rounded-xl border bg-white p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary-600 text-white flex items-center justify-center font-semibold">
          {hospital.name.slice(0, 2)}
        </div>
        <div className="font-semibold text-primary-700">{hospital.name}</div>
      </section>

      {/* チェックリスト（現UIのまま） */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-primary-700">申し込み前のチェックリスト</h2>

        <div className="rounded-md border bg-green-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profileOk} onChange={() => setProfileOk(!profileOk)} />
            基本情報は登録されていますか？（氏名・メール・卒業年）
          </label>
        </div>

        <div className="rounded-md border bg-blue-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={motivationOk} onChange={() => setMotivationOk(!motivationOk)} />
            志望動機の内容を確認しましたか？（病院ごとに内容を見直しましょう）
          </label>
        </div>

        <div className="rounded-md border bg-amber-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={resumeOk} onChange={() => setResumeOk(!resumeOk)} />
            レジュメは入力済み／PDF化できていますか？
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <span className="text-xs text-gray-600">{file.name}</span>}
          </div>
        </div>
      </section>

      {/* 送信 */}
      <div className="text-right">
        <button
          onClick={handleSend}
          disabled={disabled}
          className={`px-5 py-2 rounded text-white ${
            disabled ? "bg-gray-300" : "bg-primary-600 hover:bg-primary-700"
          }`}
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