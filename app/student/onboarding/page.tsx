'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/app/lib/supabase/client';

/** ---- 型（必要最低限） ---- */
type StudentRow = {
  id: string;
  // 既存カラム
  name: string | null;
  email: string | null;
  university?: string | null;
  grad_year?: number | null;
  // 追加カラム（前提のDDLで追加済）
  last_name?: string | null;
  first_name?: string | null;
  last_name_kana?: string | null;
  first_name_kana?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  faculty?: string | null;
  phone?: string | null;
  preferences?: any; // jsonb
};

/** ---- ステップの定義 ---- */
const STEPS = ['基本情報', '大学情報', '連絡先', '希望条件'] as const;

export default function StudentOnboardingPage() {
  const sb = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);

  // プリフィル用の状態
  const [email, setEmail] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastKana, setLastKana] = useState('');
  const [firstKana, setFirstKana] = useState('');
  const [gender, setGender] = useState('');
  const [birth, setBirth] = useState('');

  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [gradYear, setGradYear] = useState<number | ''>('');

  const [phone, setPhone] = useState('');

  // 希望条件（jsonb）
  const [prefArea, setPrefArea] = useState('');
  const [prefDuty, setPrefDuty] = useState('');
  const [prefSalary, setPrefSalary] = useState<number | ''>('');

  /** ユーザー読み込み＆プリフィル */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        // 未ログインならログインへ
        router.replace('/login');
        return;
      }
      setEmail(user.email ?? '');

      // 既存行
      const { data: row } = await sb
        .from('students')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (row) {
        setLastName(row.last_name ?? '');
        setFirstName(row.first_name ?? '');
        setLastKana(row.last_name_kana ?? '');
        setFirstKana(row.first_name_kana ?? '');
        setGender(row.gender ?? '');
        setBirth(row.birthdate ?? '');
        setUniversity(row.university ?? '');
        setFaculty(row.faculty ?? '');
        setGradYear(row.grad_year ?? '');
        setPhone(row.phone ?? '');
        const p = row.preferences ?? {};
        setPrefArea(p.area ?? '');
        setPrefDuty(p.duty ?? '');
        setPrefSalary(p.salaryMin ?? '');
      } else {
        // まだ row が無ければ空で良い（/api/onboard で作られている前提）
      }
      setLoading(false);
    })();
  }, [router, sb]);

  /** students に upsert（部分保存） */
  const upsertStudent = async (patch: Partial<StudentRow>) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('not logged in');
    const row: Partial<StudentRow> = { id: user.id, ...patch };
    const { error } = await sb.from('students').upsert(row);
    if (error) throw error;
  };

  /** 1ステップ分の保存（次へボタン） */
  const onSaveStep = async () => {
    try {
      switch (step) {
        case 0: {
          // 基本情報 → students + Users.metadata（full_name）
          const fullName =
            [lastName.trim(), firstName.trim()].filter(Boolean).join(' ') || null;

          await upsertStudent({
            last_name: lastName || null,
            first_name: firstName || null,
            last_name_kana: lastKana || null,
            first_name_kana: firstKana || null,
            gender: gender || null,
            birthdate: birth || null,
            name: fullName,           // 既存 name も更新しておく
            email,
          });

          // Users.metadata にも保存（ヘッダー表示にすぐ効く）
          await sb.auth.updateUser({
            data: { full_name: fullName ?? undefined, name: fullName ?? undefined },
          }).catch(() => {});
          break;
        }

        case 1: {
          await upsertStudent({
            university: university || null,
            faculty: faculty || null,
            grad_year: gradYear ? Number(gradYear) : null,
          });
          break;
        }

        case 2: {
          await upsertStudent({
            phone: phone || null,
          });
          break;
        }

        case 3: {
          await upsertStudent({
            preferences: {
              area: prefArea || null,
              duty: prefDuty || null,
              salaryMin: prefSalary ? Number(prefSalary) : null,
            },
          });
          break;
        }
      }

      if (step < STEPS.length - 1) {
        setStep((s) => s + 1);
      } else {
        // 完了 → ダッシュボードへ
        router.replace('/student/dashboard');
      }
    } catch (e: any) {
      alert(`保存に失敗しました：${e?.message ?? 'unknown error'}`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500">
        読み込み中…
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* ヘッダー */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500 text-white rounded-2xl text-xl font-bold">
          学
        </div>
        <h1 className="mt-3 text-2xl font-bold text-primary-700">医志マッチ</h1>
        <p className="text-sm text-gray-500">プロフィールを完成させて、最適な病院を見つけましょう</p>
      </div>

      {/* ステップインジケータ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>ステップ {step + 1} / {STEPS.length}</span>
          <span className="ml-auto">{Math.round(((step + 1) / STEPS.length) * 100)}% 完了</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 bg-primary-500 rounded-full transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-gray-600">
          {STEPS.map((t, i) => (
            <span key={t} className={i === step ? 'text-primary-600 font-semibold' : ''}>{t}</span>
          ))}
        </div>
      </div>

      {/* ステップのフォーム */}
      <section className="bg-white rounded-xl shadow-card p-6 space-y-4">
        {step === 0 && (
          <>
            <h2 className="font-semibold text-primary-700">基本情報</h2>
            <TwoCols>
              <Field label="姓*" value={lastName} onChange={setLastName} />
              <Field label="名*" value={firstName} onChange={setFirstName} />
              <Field label="セイ" value={lastKana} onChange={setLastKana} />
              <Field label="メイ" value={firstKana} onChange={setFirstKana} />
              <Field label="性別" value={gender} onChange={setGender} placeholder="男性/女性/その他" />
              <Field label="生年月日" value={birth} onChange={setBirth} placeholder="YYYY-MM-DD" />
              <ReadOnly label="メール" value={email} />
            </TwoCols>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-semibold text-primary-700">大学情報</h2>
            <TwoCols>
              <Field label="大学" value={university} onChange={setUniversity} />
              <Field label="学部" value={faculty} onChange={setFaculty} />
              <Field label="卒業予定年" value={gradYear} onChange={(v)=> setGradYear(v as any)} placeholder="2026" />
            </TwoCols>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold text-primary-700">連絡先</h2>
            <TwoCols>
              <Field label="電話番号" value={phone} onChange={setPhone} placeholder="090-xxxx-xxxx" />
              <ReadOnly label="メール" value={email} />
            </TwoCols>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold text-primary-700">希望条件</h2>
            <TwoCols>
              <Field label="希望エリア" value={prefArea} onChange={setPrefArea} placeholder="例：東京/関西 など" />
              <Field label="当直回数の希望" value={prefDuty} onChange={setPrefDuty} placeholder="～2回/3～4回/5回～ など" />
              <Field label="最低希望年収" value={prefSalary} onChange={(v)=> setPrefSalary(Number(v) as any)} placeholder="600" />
            </TwoCols>
          </>
        )}

        {/* フッター操作 */}
        <div className="flex items-center justify-between pt-4">
          <button
            className="px-4 py-2 text-sm rounded border"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ‹ 戻る
          </button>

          <div className="text-xs text-gray-400">
            <a href="/student/dashboard" className="hover:underline">後でプロフィールを設定する</a>
          </div>

          <button
            className="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700"
            onClick={onSaveStep}
          >
            {step < STEPS.length - 1 ? '次へ ›' : '完了する'}
          </button>
        </div>
      </section>
    </main>
  );
}

/** ---- 小さな部品 ---- */
function TwoCols({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-4">{children}</div>;
}
function Field({
  label, value, onChange, placeholder,
}: { label: string; value: any; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input className="w-full border rounded-md px-3 py-2 bg-gray-50" value={value ?? ''} readOnly />
    </div>
  );
}