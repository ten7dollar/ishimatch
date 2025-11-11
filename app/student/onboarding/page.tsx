'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/app/lib/supabase/client';

/** ---- 型 ---- */
type Gender = '' | '男性' | '女性' | 'その他';
type DutyPref = '' | '〜2回' | '3回〜4回' | '5回以上' | '特になし';
type SalaryBand = '' | '〜399万円' | '400〜599万円' | '600〜799万円' | '800万円〜' | '特になし';
type Prefecture =
  | ''
  | '北海道'
  | '青森県' | '岩手県' | '宮城県' | '秋田県' | '山形県' | '福島県'
  | '茨城県' | '栃木県' | '群馬県' | '埼玉県' | '千葉県' | '東京都' | '神奈川県'
  | '新潟県' | '富山県' | '石川県' | '福井県' | '山梨県' | '長野県'
  | '岐阜県' | '静岡県' | '愛知県' | '三重県'
  | '滋賀県' | '京都府' | '大阪府' | '兵庫県' | '奈良県' | '和歌山県'
  | '鳥取県' | '島根県' | '岡山県' | '広島県' | '山口県'
  | '徳島県' | '香川県' | '愛媛県' | '高知県'
  | '福岡県' | '佐賀県' | '長崎県' | '熊本県' | '大分県' | '宮崎県' | '鹿児島県' | '沖縄県';

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  university?: string | null;
  grad_year?: number | null;
  last_name?: string | null;
  first_name?: string | null;
  last_name_kana?: string | null;
  first_name_kana?: string | null;
  gender?: string | null;
  birthdate?: string | null; // YYYY-MM-DD
  faculty?: string | null;
  phone?: string | null;
  preferences?: {
    area?: Prefecture | null;
    duty?: DutyPref | null;
    salaryMin?: SalaryBand | string | number | null; // 旧互換: number/string も許容
  } | null;
};

/** ---- 定数 ---- */
const STEPS = ['基本情報', '大学情報', '連絡先', '希望条件'] as const;

// 生年月日の年・月・日（年は現在-45〜現在-18を生成）
const now = new Date();
const BIRTH_YEARS: number[] = Array.from({ length: 28 }, (_, i) => now.getFullYear() - 18 - i).reverse(); // 例: 1980〜2007くらい
const BIRTH_MONTHS: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
const BIRTH_DAYS: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

// 卒業年度
const GRAD_YEARS: number[] = [2026, 2027, 2028, 2029];

// 当直回数・年収バンド
const DUTY_OPTS: DutyPref[] = ['〜2回', '3回〜4回', '5回以上', '特になし'];
const SALARY_BANDS: SalaryBand[] = ['〜399万円', '400〜599万円', '600〜799万円', '800万円〜', '特になし'];

export default function StudentOnboardingPage() {
  const sb = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);

  // 基本情報
  const [email, setEmail] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastKana, setLastKana] = useState('');
  const [firstKana, setFirstKana] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthMonth, setBirthMonth] = useState<number | ''>('');
  const [birthDay, setBirthDay] = useState<number | ''>('');

  // 大学情報
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [gradYear, setGradYear] = useState<number | ''>('');

  // 連絡先
  const [phone, setPhone] = useState('');

  // 希望条件（jsonb）
  const [prefArea, setPrefArea] = useState<Prefecture>('');
  const [dutyPref, setDutyPref] = useState<DutyPref>('');
  const [salaryBand, setSalaryBand] = useState<SalaryBand>('');

  /** 初期ロード：Auth + students */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email ?? '');

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
        setGender((row.gender as Gender) ?? '');
        // birthdate → 年月日に分解
        if (row.birthdate && /^\d{4}-\d{2}-\d{2}$/.test(row.birthdate)) {
          const [y, m, d] = row.birthdate
            .split('-')
            .map((v: string) => Number(v)) as [number, number, number];
         setBirthYear(y || '');
         setBirthMonth(m || '');
         setBirthDay(d || '');
        }
        setUniversity(row.university ?? '');
        setFaculty(row.faculty ?? '');
        setGradYear(row.grad_year ?? '');

        setPhone(row.phone ?? '');

        // preferences 互換
        const p = row.preferences || {};
        setPrefArea((p.area as Prefecture) ?? '');
        setDutyPref((p.duty as DutyPref) ?? (p.dutyPref as DutyPref) ?? '');
        // number/string いずれも帯に寄せる（単純マップ）
        const rawSalary = p.salaryMin;
        if (typeof rawSalary === 'number') {
          if (rawSalary >= 800) setSalaryBand('800万円〜');
          else if (rawSalary >= 600) setSalaryBand('600〜799万円');
          else if (rawSalary >= 400) setSalaryBand('400〜599万円');
          else setSalaryBand('〜399万円');
        } else if (typeof rawSalary === 'string') {
          // 既に帯ならそのまま / 数字文字列なら上と同じ処理へ
          if (SALARY_BANDS.includes(rawSalary as SalaryBand)) {
            setSalaryBand(rawSalary as SalaryBand);
          } else {
            const n = Number(rawSalary);
            if (!isNaN(n)) {
              if (n >= 800) setSalaryBand('800万円〜');
              else if (n >= 600) setSalaryBand('600〜799万円');
              else if (n >= 400) setSalaryBand('400〜599万円');
              else setSalaryBand('〜399万円');
            }
          }
        }
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

  /** step保存 */
  const onSaveStep = async () => {
    try {
      if (step === 0) {
        const fullName =
          [lastName.trim(), firstName.trim()].filter(Boolean).join(' ') || null;

        // 生年月日（3つ揃ったときだけ保存）
        const birthdate =
          birthYear && birthMonth && birthDay
            ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
            : null;

        await upsertStudent({
          last_name: lastName || null,
          first_name: firstName || null,
          last_name_kana: lastKana || null,
          first_name_kana: firstKana || null,
          gender: gender || null,
          birthdate,
          name: fullName, // 既存 name も更新
          email,
        });

        // Users.metadata も更新（ヘッダー即時反映）
        await sb.auth.updateUser({
          data: { full_name: fullName ?? undefined, name: fullName ?? undefined },
        }).catch(() => {});
      }

      if (step === 1) {
        await upsertStudent({
          university: university || null,
          faculty: faculty || null,
          grad_year: gradYear ? Number(gradYear) : null,
        });
      }

      if (step === 2) {
        await upsertStudent({ phone: phone || null });
      }

      if (step === 3) {
        await upsertStudent({
          preferences: {
            area: (prefArea as Prefecture) || null,
            duty: (dutyPref as DutyPref) || null,
            // 文字帯で保存（JSONBなので柔軟、将来正規化可）
            salaryMin: (salaryBand as SalaryBand) || null,
          },
        });
      }

      if (step < STEPS.length - 1) {
        setStep((s) => s + 1);
      } else {
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

      {/* ステップ/進捗 */}
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

      {/* 入力カード */}
      <section className="bg-white rounded-xl shadow-card p-6 space-y-4">
        {step === 0 && (
          <>
            <h2 className="font-semibold text-primary-700">基本情報</h2>
            <TwoCols>
              <Field label="姓*" value={lastName} onChange={setLastName} />
              <Field label="名*" value={firstName} onChange={setFirstName} />
              <Field label="セイ" value={lastKana} onChange={setLastKana} />
              <Field label="メイ" value={firstKana} onChange={setFirstKana} />

              {/* 性別：選択式 */}
              <SelectField label="性別" value={gender} onChange={(v)=> setGender(v as Gender)}>
                <option value="">選択してください</option>
                {(['男性','女性','その他'] as Gender[]).map(g => <option key={g} value={g}>{g}</option>)}
              </SelectField>

              {/* 生年月日：年/月/日 */}
              <div className="grid grid-cols-3 gap-2">
                <SelectField label="生年" value={birthYear} onChange={(v)=> setBirthYear(Number(v) || '' )}>
                  <option value="">年</option>
                  {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </SelectField>
                <SelectField label="月" value={birthMonth} onChange={(v)=> setBirthMonth(Number(v) || '' )}>
                  <option value="">月</option>
                  {BIRTH_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </SelectField>
                <SelectField label="日" value={birthDay} onChange={(v)=> setBirthDay(Number(v) || '' )}>
                  <option value="">日</option>
                  {BIRTH_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </SelectField>
              </div>

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
              {/* 卒業年度：選択式 */}
              <SelectField label="卒業年度" value={gradYear} onChange={(v)=> setGradYear(Number(v) || '' )}>
                <option value="">選択してください</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </SelectField>
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
              <Field label="希望エリア" value={prefArea} onChange={(v)=> setPrefArea(v as Prefecture)} placeholder="例：東京都 など" />
              <SelectField label="当直回数" value={dutyPref} onChange={(v)=> setDutyPref(v as DutyPref)}>
                <option value="">選択してください</option>
                {DUTY_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </SelectField>
              <SelectField label="最低希望年収" value={salaryBand} onChange={(v)=> setSalaryBand(v as SalaryBand)}>
                <option value="">選択してください</option>
                {SALARY_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </SelectField>
            </TwoCols>
          </>
        )}

        {/* 操作 */}
        <div className="flex items-center justify-between pt-4">
          <button
            className="px-4 py-2 text-sm rounded border"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ‹ 戻る
          </button>

          <div className="text-xs text-gray-400">
            <a href="/student/dashboard" className="hover:underline">後で設定する</a>
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
function SelectField({
  label, value, onChange, children,
}: { label: string; value: any; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-primary-300"
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
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