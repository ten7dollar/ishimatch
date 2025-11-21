"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import UploadDocuments from "./_components/UploadDocuments";

/** students テーブルのうち、レジュメで扱うカラムのみ（URLカラムは未使用に） */
type StudentResume = {
  id: string;
  // 学歴
  university: string | null;
  faculty: string | null;
  enroll_year: number | null;
  grad_year: number | null;
  gpa: number | null;

  // 希望・条件
  duty_preference: string | null;   // "可能" | "相談" | "不可"
  desired_salary_min: number | null;
  major: string | null;             // カンマ区切り or text[]

  // 自己PR
  motivation: string | null;
  self_pr: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, ph, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; ph?: string; type?: string }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type={type}
        className="border p-2 rounded text-sm w-full"
        placeholder={ph}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, ph, rows = 6,
}: { label: string; value: string; onChange: (v: string) => void; ph?: string; rows?: number }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <textarea
        className="border p-2 rounded text-sm w-full"
        placeholder={ph}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  );
}

export default function ResumePage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [uid, setUid] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ===== レジュメで扱う state =====
  // 学歴
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [enrollYear, setEnrollYear] = useState<string>("");
  const [gradYear, setGradYear] = useState<string>("");
  const [gpa, setGpa] = useState<string>("");

  // 希望・条件
  const [duty, setDuty] = useState("");               // "可能" | "相談" | "不可"
  const [desiredSalaryMin, setDesiredSalaryMin] = useState<string>("");
  const [major, setMajor] = useState("");            // カンマ区切りで保持

  // 自己PR
  const [motivation, setMotivation] = useState("");
  const [selfPr, setSelfPr] = useState("");

  // タブ（基本情報は削除）
  const tabs = ["学歴", "希望条件", "自己PR・書類"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("学歴");

  /** ===== 取得 ===== */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      const row = data as Partial<StudentResume> | null;

      // 初回のユーザーは空を作る
      if (!row) {
        await supabase.from("students").upsert({ id: user.id, email: user.email ?? null });
      } else {
        // レジュメ項目だけ初期値セット
        setUniversity(row.university ?? "");
        setFaculty(row.faculty ?? "");
        setEnrollYear(row.enroll_year != null ? String(row.enroll_year) : "");
        setGradYear(row.grad_year != null ? String(row.grad_year) : "");
        setGpa(row.gpa != null ? String(row.gpa) : "");
        setDuty(row.duty_preference ?? "");
        setDesiredSalaryMin(row.desired_salary_min != null ? String(row.desired_salary_min) : "");
        setMajor(row.major ?? "");
        setMotivation(row.motivation ?? "");
        setSelfPr(row.self_pr ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  /** ===== 保存（レジュメ項目だけ upsert） ===== */
  const save = useCallback(async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const payload: Partial<StudentResume> = {
        id: uid,
        university: university || null,
        faculty: faculty || null,
        enroll_year: enrollYear ? Number(enrollYear) : null,
        grad_year: gradYear ? Number(gradYear) : null,
        gpa: gpa ? Number(gpa) : null,
        duty_preference: duty || null,
        desired_salary_min: desiredSalaryMin ? Number(desiredSalaryMin) : null,
        major: major || null,
        motivation: motivation || null,
        self_pr: selfPr || null,
      };

      const { error } = await supabase.from("students").upsert(payload);
      if (error) throw error;

      alert("保存しました。");
    } catch (e: any) {
      alert(`保存に失敗しました: ${e?.message ?? "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }, [uid, university, faculty, enrollYear, gradYear, gpa, duty, desiredSalaryMin, major, motivation, selfPr, supabase]);

  if (loading) {
    return <main className="max-w-5xl mx-auto p-6 text-sm text-gray-600">読込中…</main>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-bold">レジュメを作る</h1>
      <p className="text-gray-600">学歴・希望条件・自己PRを編集して保存できます。書類はこの画面からアップロードできます。</p>

      {/* タブ */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm ${tab === t ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded text-sm">
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>

      {/* === 学歴 === */}
      {tab === "学歴" && (
        <Section title="学歴">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="大学名" value={university} onChange={setUniversity} ph="例：京都大学" />
            <Field label="学部・学科" value={faculty} onChange={setFaculty} ph="例：医学部医学科" />
            <Field label="入学年（西暦）" value={enrollYear} onChange={setEnrollYear} ph="例：2019" type="number" />
            <Field label="卒業予定年（西暦）" value={gradYear} onChange={setGradYear} ph="例：2026" type="number" />
            <Field label="GPA" value={gpa} onChange={setGpa} ph="例：3.8" />
          </div>
        </Section>
      )}

      {/* === 希望条件 === */}
      {tab === "希望条件" && (
        <Section title="希望条件">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="志望診療科（カンマ区切り）" value={major} onChange={setMajor} ph="例：救急科,総合診療科" />
            <Field label="希望年収（最低/万円）" value={desiredSalaryMin} onChange={setDesiredSalaryMin} ph="例：500" type="number" />
            <Field label="当直可否（可能/相談/不可）" value={duty} onChange={setDuty} ph="例：可能" />
          </div>
        </Section>
      )}

      {/* === 自己PR + 書類アップロード === */}
      {tab === "自己PR・書類" && (
        <Section title="自己PR と 提出書類">
          <TextArea label="志望動機" value={motivation} onChange={setMotivation} rows={8} ph="600字以内で記載してください" />
          <TextArea label="自己PR" value={selfPr} onChange={setSelfPr} rows={10} ph="これまでの経験・強み・熱意など" />

          {/* ここを URL 入力ではなくファイル選択 UI に置き換え */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-primary-700 mb-2">提出書類</h3>
            {/* 学生IDを渡して documents/{uid}/ に保存 */}
            <UploadDocuments studentId={uid} />
          </div>
        </Section>
      )}
    </main>
  );
}