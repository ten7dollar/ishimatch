"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** Supabase students の型（必要最小限 + 追加カラム） */
type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;

  // 基本情報
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  gender: string | null;
  birthdate: string | null; // YYYY-MM-DD
  phone: string | null;

  // 住所・地域
  region: string | null;
  prefecture: string | null;

  // 学歴
  university: string | null;
  faculty: string | null;
  enroll_year: number | null; // 追加
  grad_year: number | null;
  gpa: number | null;         // 追加

  // 希望
  duty_preference: string | null;  // "可能" | "相談" | "不可"
  desired_salary_min: number | null;
  major: string | null;            // カンマ区切りで保存

  // 自己PRなど
  self_pr: string | null;          // 追加
  motivation: string | null;       // 追加

  // 任意の書類URL
  transcript_url: string | null;
  certificate_url: string | null;

  // JSON 拡張フィールド（将来用）
  preferences: any;
};

/** 小さなUI部品 */
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
}: {
  label: string; value: string; onChange: (v: string) => void; ph?: string; type?: string;
}) {
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

/* =========================================================
   レジュメ本体（students に直接 upsert）
========================================================= */
export default function ResumePage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [uid, setUid] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** ====== 入力 State（students カラムを網羅） ====== */
  // 基本情報
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastKana, setLastKana] = useState("");
  const [firstKana, setFirstKana] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState(""); // yyyy-mm-dd
  const [phone, setPhone] = useState("");

  // 住所・地域
  const [region, setRegion] = useState("");
  const [prefecture, setPrefecture] = useState("");

  // 学歴
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [enrollYear, setEnrollYear] = useState<string>("");
  const [gradYear, setGradYear] = useState<string>("");
  const [gpa, setGpa] = useState<string>("");

  // 希望
  const [duty, setDuty] = useState(""); // 可能/相談/不可
  const [desiredSalaryMin, setDesiredSalaryMin] = useState<string>("");
  const [major, setMajor] = useState(""); // カンマ区切り（救急科,総合診療…）

  // 自己PR
  const [motivation, setMotivation] = useState("");
  const [selfPr, setSelfPr] = useState("");

  // 任意の書類URL
  const [transcriptUrl, setTranscriptUrl] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");

  /** ====== タブ ====== */
  const tabs = ["基本情報", "学歴", "経験", "スキル・自己PR"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("基本情報");

  /** ====== 読み込み ====== */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);

      // 既存行を取得、なければ on-board 相当で作成
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      const row: StudentRow =
        (data as StudentRow) ??
        (await (async () => {
          await supabase.from("students").upsert({
            id: user.id,
            email: user.email ?? null,
            name: (user.user_metadata?.full_name || user.user_metadata?.name || null) as string | null,
          });
          const { data: created } = await supabase.from("students").select("*").eq("id", user.id).maybeSingle();
          return created as StudentRow;
        })());

      // 既存値で初期化（オンボの値も反映）
      setLastName(row.last_name ?? "");
      setFirstName(row.first_name ?? "");
      setLastKana(row.last_name_kana ?? "");
      setFirstKana(row.first_name_kana ?? "");
      setGender(row.gender ?? "");
      setBirthdate(row.birthdate ?? "");
      setPhone(row.phone ?? user.phone ?? "");

      setRegion(row.region ?? "");
      setPrefecture(row.prefecture ?? "");

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

      setTranscriptUrl(row.transcript_url ?? "");
      setCertificateUrl(row.certificate_url ?? "");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  /** ====== 保存 ====== */
  const save = useCallback(async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const payload: Partial<StudentRow> = {
        id: uid,

        last_name: lastName || null,
        first_name: firstName || null,
        last_name_kana: lastKana || null,
        first_name_kana: firstKana || null,
        gender: gender || null,
        birthdate: birthdate || null,
        phone: phone || null,

        region: region || null,
        prefecture: prefecture || null,

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

        transcript_url: transcriptUrl || null,
        certificate_url: certificateUrl || null,

        // 任意：更新日時
        // updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("students").upsert(payload);
      if (error) throw error;
      alert("保存しました。");
    } catch (e: any) {
      alert(`保存に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  }, [
    uid, lastName, firstName, lastKana, firstKana, gender, birthdate, phone,
    region, prefecture, university, faculty, enrollYear, gradYear, gpa,
    duty, desiredSalaryMin, major, motivation, selfPr, transcriptUrl, certificateUrl, supabase
  ]);

  if (loading) {
    return <main className="max-w-5xl mx-auto p-6 text-sm text-gray-600">読込中…</main>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-bold">レジュメを作る</h1>
      <p className="text-text-muted">入力して保存すると、病院の検索・閲覧に活用されます。</p>

      {/* タブ */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {(["基本情報","学歴","経験","スキル・自己PR"] as const).map((t) => (
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

      {/* 入力本体 */}
      {tab === "基本情報" && (
        <Section title="基本情報">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="姓" value={lastName} onChange={setLastName} />
            <Field label="名" value={firstName} onChange={setFirstName} />
            <Field label="姓（かな）" value={lastKana} onChange={setLastKana} />
            <Field label="名（かな）" value={firstKana} onChange={setFirstKana} />
            <Field label="性別" value={gender} onChange={setGender} />
            <Field label="生年月日（YYYY-MM-DD）" value={birthdate} onChange={setBirthdate} ph="1998-08-05" />
            <Field label="電話番号" value={phone} onChange={setPhone} />
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <Field label="地域（地方）" value={region} onChange={setRegion} ph="例：関東" />
            <Field label="都道府県" value={prefecture} onChange={setPrefecture} ph="例：東京都" />
          </div>
        </Section>
      )}

      {tab === "学歴" && (
        <Section title="学歴">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="大学名" value={university} onChange={setUniversity} ph="例：京都大学" />
            <Field label="学部・学科" value={faculty} onChange={setFaculty} ph="例：医学部医学科" />
            <Field label="入学年" value={enrollYear} onChange={setEnrollYear} ph="例：2019" type="number" />
            <Field label="卒業予定年" value={gradYear} onChange={setGradYear} ph="例：2026" type="number" />
            <Field label="GPA" value={gpa} onChange={setGpa} ph="例：3.8" />
          </div>

          <div className="text-right">
            <button onClick={save} className="px-4 py-2 bg-primary-600 text-white rounded text-sm">保存する</button>
          </div>
        </Section>
      )}

      {tab === "経験" && (
        <Section title="経験（希望条件）">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="志望診療科（カンマ区切り）" value={major} onChange={setMajor} ph="救急科,総合診療科" />
            <Field label="希望年収（最低・万円）" value={desiredSalaryMin} onChange={setDesiredSalaryMin} ph="500" type="number" />
            <Field label="当直可否（可能/相談/不可）" value={duty} onChange={setDuty} ph="可能" />
          </div>

          <div className="text-right mt-2">
            <button onClick={save} className="px-4 py-2 bg-primary-600 text-white rounded text-sm">保存する</button>
          </div>
        </Section>
      )}

      {tab === "スキル・自己PR" && (
        <Section title="スキル・自己PR">
          <TextArea label="志望動機" value={motivation} onChange={setMotivation} rows={8} ph="600字以内" />
          <TextArea label="自己PR" value={selfPr} onChange={setSelfPr} rows={10} ph="600字以内" />

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <Field label="成績証明書URL（任意）" value={transcriptUrl} onChange={setTranscriptUrl} />
            <Field label="資格証明書URL（任意）" value={certificateUrl} onChange={setCertificateUrl} />
          </div>

          <div className="text-right mt-3">
            <button onClick={save} className="px-4 py-2 bg-primary-600 text-white rounded text-sm">保存する</button>
          </div>
        </Section>
      )}
    </main>
  );
}