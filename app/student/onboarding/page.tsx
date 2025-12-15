'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
// ★ 利用規約ステップを追加
const STEPS = ['基本情報', '大学情報', '連絡先', '希望条件', '利用規約'] as const;

// 生年月日の年・月・日（年は現在-45〜現在-18を生成）
const now = new Date();
const BIRTH_YEARS: number[] = Array.from({ length: 28 }, (_, i) => now.getFullYear() - 18 - i).reverse();
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

  // ★ 利用規約チェック
  const [agreedTerms, setAgreedTerms] = useState(false);

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
        const rawSalary = p.salaryMin;
        if (typeof rawSalary === 'number') {
          if (rawSalary >= 800) setSalaryBand('800万円〜');
          else if (rawSalary >= 600) setSalaryBand('600〜799万円');
          else if (rawSalary >= 400) setSalaryBand('400〜599万円');
          else setSalaryBand('〜399万円');
        } else if (typeof rawSalary === 'string') {
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
      // ステップごとの保存ロジックは既存どおり
      if (step === 0) {
        const fullName =
          [lastName.trim(), firstName.trim()].filter(Boolean).join(' ') || null;

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
          name: fullName,
          email,
        });

        await sb.auth
          .updateUser({
            data: { full_name: fullName ?? undefined, name: fullName ?? undefined },
          })
          .catch(() => {});
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
            salaryMin: (salaryBand as SalaryBand) || null,
          },
        });
      }

      // ★ 最終ステップ（利用規約）は必須チェック
      if (step === STEPS.length - 1) {
        if (!agreedTerms) {
          alert('本サービスの利用には利用規約への同意が必要です。');
          return;
        }
        router.replace('/student/dashboard');
        return;
      }

      // ★ それ以外は次へ
      if (step < STEPS.length - 1) {
        setStep((s) => s + 1);
      }
    } catch (e: any) {
      alert(`保存に失敗しました：${e?.message ?? 'unknown error'}`);
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const canComplete = !isLastStep || agreedTerms;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500">
        読み込み中…
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* ヘッダー（ロゴ差し替え） */}
      <div className="text-center mb-6">
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/brand/regimatch-logo.svg"
            alt="レジマッチ"
            width={180}
            height={60}
            priority
            className="h-12 w-auto"
          />
          <p className="text-sm text-gray-500">
            プロフィールを完成させて、最適な病院を見つけましょう
          </p>
        </div>
      </div>

      {/* ステップ/進捗 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>
            ステップ {step + 1} / {STEPS.length}
          </span>
          <span className="ml-auto">
            {Math.round(((step + 1) / STEPS.length) * 100)}% 完了
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 bg-primary-500 rounded-full transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-gray-600">
          {STEPS.map((t, i) => (
            <span key={t} className={i === step ? 'text-primary-600 font-semibold' : ''}>
              {t}
            </span>
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

              <SelectField label="性別" value={gender} onChange={(v) => setGender(v as Gender)}>
                <option value="">選択してください</option>
                {(['男性', '女性', 'その他'] as Gender[]).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </SelectField>

              <div className="grid grid-cols-3 gap-2">
                <SelectField label="生年" value={birthYear} onChange={(v) => setBirthYear(Number(v) || '')}>
                  <option value="">年</option>
                  {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </SelectField>
                <SelectField label="月" value={birthMonth} onChange={(v) => setBirthMonth(Number(v) || '')}>
                  <option value="">月</option>
                  {BIRTH_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </SelectField>
                <SelectField label="日" value={birthDay} onChange={(v) => setBirthDay(Number(v) || '')}>
                  <option value="">日</option>
                  {BIRTH_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
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
              <SelectField label="卒業年度" value={gradYear} onChange={(v) => setGradYear(Number(v) || '')}>
                <option value="">選択してください</option>
                {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
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
              <Field label="希望エリア" value={prefArea} onChange={(v) => setPrefArea(v as Prefecture)} placeholder="例：東京都 など" />
              <SelectField label="当直回数" value={dutyPref} onChange={(v) => setDutyPref(v as DutyPref)}>
                <option value="">選択してください</option>
                {DUTY_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </SelectField>
              <SelectField label="最低希望年収" value={salaryBand} onChange={(v) => setSalaryBand(v as SalaryBand)}>
                <option value="">選択してください</option>
                {SALARY_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </SelectField>
            </TwoCols>
          </>
        )}
<div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
  ※掲載している病院情報は当社の独自調査に基づく参考情報です。利用はユーザーの自己責任とし、
  最新情報は必ず病院公式サイト等でご確認ください。
</div>

        {/* 利用規約 */}
        {step === 4 && (
          <>
            <h2 className="font-semibold text-primary-700">利用規約への同意</h2>
            <p className="text-xs text-gray-600">
              レジマッチをご利用いただくにあたり、以下の利用規約を必ずご確認いただき、同意のうえご利用ください。
            </p>

            <div className="border rounded-lg max-h-72 overflow-y-auto p-3 text-[11px] leading-relaxed whitespace-pre-wrap bg-slate-50">
              {/* ★ 利用規約は後で差し替えOK */}
              {`レジマッチ利用規約（株式会社OpenYouth）


第1条（目的および適用）

1. 本利用規約（以下「本規約」といいます。）は、株式会社OpenYouth（以下「当社」といいます。）が提供する、初期研修医と総合病院その他の医療機関とのマッチングプラットフォーム「レジマッチ」（以下「本サービス」といいます。）の利用条件を定めるものです。
2. 本サービスを利用する全ての者（第2条で定義します。以下総称して「ユーザー」といいます。）は、本規約の内容に同意したうえで本サービスを利用するものとします。
3. 当社が本サービスに関して本サイト上等で公表するガイドライン、ルール、ポリシー、個別契約その他の定め（以下「個別規定」といいます。）は、本規約の一部を構成するものとし、本規約と個別規定が矛盾する場合は、個別規定が優先して適用されます。

第2条（定義）

本規約において使用する用語の定義は、次のとおりとします。

1. 「本サイト」：当社が本サービスのために運営するウェブサイトおよび関連する管理画面等
2. 「研修医ユーザー」：初期臨床研修を希望する医師その他当社が認めた個人で、本サービスに登録した者
3. 「医療機関ユーザー」：総合病院その他の医療機関、法人、団体等で、本サービスに登録した者
4. 「ユーザー」：研修医ユーザーおよび医療機関ユーザーの総称
5. 「アカウント」：本サービス利用のために当社が発行するIDおよびこれに付随する情報
6. 「コンテンツ」：ユーザーまたは当社が本サービスを通じて登録、投稿または送信する一切の情報（求人情報、プロフィール情報、メッセージ、画像、書類データ等を含みます。）

第3条（本規約への同意）

1. ユーザーは、本サービスの利用開始時点で、本規約の全ての条項に同意したものとみなされます。
2. 未成年の研修医ユーザーが本サービスを利用する場合、親権者その他の法定代理人の同意を得たうえで利用するものとし、当該同意を得ていることを当社に対して表明し保証するものとします。

第4条（利用登録）

1. 本サービスの利用を希望する者は、本規約に同意のうえ、当社の定める方法により、真実かつ最新・正確な情報をもって利用登録の申込みを行うものとします。
2. 当社は、当社の基準に従い審査を行い、利用登録を承諾した場合はその旨を申込者に通知します。当社が承諾した時点で、当社と当該申込者との間で本サービスの利用契約（以下「利用契約」といいます。）が成立します。
3. 当社は、以下の各号のいずれかに該当すると判断した場合、利用登録の申込みを承諾しないことがあります。当社は、その理由を開示する義務を負いません。
    1. 申込内容に虚偽、誤記、記載漏れがある場合
    2. 過去に本規約に違反したことがある者からの申込みである場合
    3. 医療機関ユーザーの申込みについて、当社が医療機関として不適切であると判断した場合
    4. 研修医ユーザーの申込みについて、医師資格が確認できない等の理由により不適切であると当社が判断した場合
    5. 反社会的勢力（第16条）の構成員等に該当し、または関係を有すると当社が判断した場合
    6. その他、当社が利用登録を不適切と判断した場合

第5条（アカウントの管理）

1. ユーザーは、自己の責任において、アカウント情報（IDおよびパスワードを含みます。）を適切に管理・保管し、いかなる場合も第三者に利用させず、貸与、譲渡、名義変更、売買等をしてはなりません。
2. アカウント情報の管理不備、使用上の過誤、第三者の使用等により生じた損害については、当社の故意または重過失がある場合を除き、当社は一切責任を負いません。
3. ユーザーは、アカウント情報が第三者に使用されていることが判明した場合、直ちに当社に通知し、当社の指示に従うものとします。

第6条（医療機関ユーザーの義務・表明保証）

医療機関ユーザーは、当社および研修医ユーザーに対し、次の事項を表明し、保証します。

1. 自らが医療法その他関係法令に基づき適法に設立・運営されている医療機関または法人等であること
2. 本サービス上に掲載する募集内容、勤務条件、処遇、研修内容等が真実かつ正確であり、誤解を生じさせる表示を含まないこと
3. 研修医との間で締結される雇用契約、研修契約その他一切の契約については、自らの責任と費用において締結・履行し、関係法令を遵守すること
4. 本サービスを通じて取得した研修医ユーザーの情報を、本規約および当社のプライバシーポリシーに従い適切に取り扱うこと
5. 研修医ユーザーとの間で紛争が生じた場合、当社の関与を求めることなく、自己の責任と費用において解決すること（当社が任意に関与する場合を除きます。）

第7条（研修医ユーザーの義務・表明保証）

研修医ユーザーは、当社および医療機関ユーザーに対し、次の事項を表明し、保証します。

1. 自らが医師法その他関係法令に基づく適切な資格を有し、または取得見込みであること
2. 本サービス上に登録する経歴、資格、希望条件その他の情報が真実かつ正確であること
3. 医療機関ユーザーとの間で締結される雇用契約、研修契約その他一切の契約については、自らの責任と判断において締結・履行すること
4. 本サービスを通じて知り得た医療機関ユーザーの情報を、第三者に漏えいせず、不正に利用しないこと
5. 研修医ユーザーとしての地位を第三者に利用させたり、譲渡したりしないこと

第8条（本サービスの内容および当社の役割）

1. 本サービスは、研修医ユーザーと医療機関ユーザーとの間の出会い・情報提供およびマッチングの機会を提供するものであり、当社は、原則として研修医ユーザーと医療機関ユーザーとの間で締結される契約の当事者ではありません。
2. 当社は、ユーザー同士の連絡の場を提供しますが、ユーザー間で行われる一切の連絡、交渉、契約締結、勤務・研修の実施等について、その結果を保証するものではありません。
3. 当社は、ユーザーが本サービス上に登録した情報の正確性、最新性、有用性等について、一切保証しません。ユーザーは自己の責任において相手方を判断・選択し、必要に応じて直接確認を行うものとします。
4. 当社は、ユーザー間またはユーザーと第三者との間で生じたトラブルについて、当社の故意または重過失がある場合を除き、一切の責任を負いません。

第9条（利用料金および支払方法）

1. 本サービスのうち、研修医ユーザーによる基本的な機能の利用は原則として無料とします。ただし、当社が別途有料と定めた機能についてはこの限りではありません。
2. 医療機関ユーザーに対する本サービスの利用料金、支払方法、その他条件は、当社が別途定め、本サイト上に表示するものとします。
3. ユーザーは、当社が定める期日までに、当社が指定する方法により利用料金を支払うものとします。
4. ユーザーの都合による解約・退会等があった場合であっても、既に支払われた利用料金は、法令に別段の定めがある場合を除き返金されないものとします。
5. ユーザーが利用料金の支払いを遅滞した場合、ユーザーは、年14.6％の割合による遅延損害金を当社に支払うものとします。

第10条（禁止事項）

ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。

1. 法令または公序良俗に違反する行為
2. 虚偽または誤解を招く情報を登録・提供する行為
3. 他人になりすまして本サービスを利用する行為
4. 医師資格を有しない者が研修医ユーザーとして登録する行為、または有資格者であるかのように装う行為
5. 医療機関としての実体を有しない者が医療機関ユーザーとして登録する行為
6. 他のユーザーまたは第三者の権利・利益を侵害する行為（名誉・信用の毀損、プライバシー侵害、知的財産権侵害等を含みます。）
7. 他のユーザーに対する嫌がらせ、誹謗中傷、脅迫、差別的言動等の行為
8. 本サービスの運営を妨害する行為、またはそのおそれのある行為
9. 当社が許可していない勧誘行為、営業活動、広告・宣伝行為
10. 本サービスを通じて得た情報を、本来のマッチング目的以外に利用または第三者に提供する行為
11. 反社会的勢力等への利益供与またはこれに加担する行為
12. その他、当社が不適切と判断する行為

第11条（利用制限および登録抹消）

1. 当社は、ユーザーが以下のいずれかに該当すると判断した場合、事前の通知なく、当該ユーザーに対し、本サービスの全部または一部の利用停止、アカウントの凍結・削除、利用契約の解除その他当社が必要と判断する措置を講じることができます。
    1. 本規約のいずれかの条項に違反した場合
    2. 登録事項に虚偽の事実があることが判明した場合
    3. 料金等の支払を怠った場合
    4. 反社会的勢力に該当し、またはそのおそれがあると当社が判断した場合
    5. 一定期間本サービスの利用がない場合
    6. その他、当社がユーザーとして不適切であると判断した場合
2. 当社は、本条に基づき当社が行った措置によりユーザーに生じた損害について、当社の故意または重過失がある場合を除き、一切責任を負いません。

第12条（本サービスの変更・中断・終了）

1. 当社は、ユーザーへの事前の通知なく、本サービスの内容の全部または一部を変更することができます。
2. 当社は、以下のいずれかに該当すると判断した場合、ユーザーに事前に通知することなく、本サービスの全部または一部の提供を一時的に中断することができます。
    1. システムの保守点検または更新を行う場合
    2. 火災、停電、天災地変、感染症拡大その他の不可抗力により、本サービスの提供が困難となった場合
    3. 通信回線、サーバ等が事故により停止した場合
    4. その他、当社が本サービスの提供を中断する必要があると判断した場合
3. 当社は、相当の期間をもって本サービス上での掲示その他当社所定の方法により通知することにより、本サービスの提供を終了することができます。
4. 当社は、本条に基づく本サービスの変更、中断または終了によりユーザーまたは第三者に生じた損害について、当社の故意または重過失がある場合を除き、一切の責任を負わないものとします。

第13条（保証の否認）

1. 当社は、本サービスがユーザーの特定の目的に適合すること、有用性、正確性、完全性、合法性、安全性、最新性等について、明示・黙示を問わず一切保証しません。
2. 当社は、本サービスを通じたマッチング、応募、選考、採用、研修の実施その他の結果について、一切保証しません。

第14条（損害賠償責任の制限）

1. 当社がユーザーに対して損害賠償責任を負う場合（債務不履行、不法行為その他請求原因を問いません。）であっても、当社の故意または重過失による場合およびユーザーの生命・身体に対する損害を除き、当社の責任は、ユーザーが当社に対して過去12か月間に支払った本サービスの利用料金の総額または金1万円のいずれか高い金額を上限とします。
2. 当社は、当社の予見の有無を問わず、特別損害、間接損害、結果的損害、逸失利益については、当社の故意または重過失による場合を除き、賠償する責任を負わないものとします。
3. 本条の規定は、消費者契約法その他の強行法規により当社の責任の全部または一部の免除が認められない場合には、当該法令に反しない範囲で適用されるものとします。([BUSINESS LAWYERS](https://www.businesslawyers.jp/practices/262?utm_source=chatgpt.com))

第15条（秘密保持）

ユーザーおよび当社は、本サービスの利用に関連して知り得た相手方の営業上・技術上その他の秘密情報を、相手方の事前の書面による承諾なく第三者に開示または漏えいしてはならず、本サービスの利用目的の範囲内でのみ利用するものとします。ただし、法令に基づき開示を求められた場合はこの限りではありません。

第16条（反社会的勢力の排除）

1. ユーザーは、自らおよびその役員・実質的支配者等が暴力団、暴力団員、暴力団関係企業、総会屋、反社会的勢力その他これらに準ずる者（以下総称して「反社会的勢力」といいます。）に該当せず、また今後も該当しないことを表明し保証します。
2. 当社は、ユーザーが前項に違反していると合理的に判断した場合、何らの催告を要せず直ちに利用契約を解除し、本サービスの提供を停止することができます。この場合、当社はユーザーに生じた損害について一切責任を負いません。

第17条（権利義務の譲渡禁止）

ユーザーは、当社の事前の書面による承諾なく、利用契約上の地位または本規約に基づく権利・義務の全部または一部を第三者に譲渡し、承継させ、担保に供し、その他処分してはなりません。

第18条（規約の変更）

1. 当社は、民法第548条の4に基づき、本規約を変更することができるものとします。
2. 当社は、本規約を変更する場合、その効力発生日を定め、効力発生日の相当期間前までに、本サービス上での掲示その他当社所定の方法により、変更後の本規約の内容および効力発生日をユーザーに周知します。
3. ユーザーが、変更後の本規約の効力発生日以降に本サービスを利用した場合、または当社が別途定める期間内に利用契約の解約手続をとらなかった場合、当該ユーザーは変更後の本規約に同意したものとみなします。

第19条（準拠法・管轄裁判所）

1. 本規約の解釈および適用については、日本法を準拠法とします。
2. 本サービスに関して当社とユーザーとの間で紛争が生じた場合には、その訴額に応じて東京地方裁判所または東京簡易裁判所を第一審の専属的合意管轄裁判所とします。

以上`}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="h-4 w-4 accent-primary-500"
              />
              <label htmlFor="agree-terms" className="text-xs text-slate-700">
                上記「利用規約」を確認し、内容に同意します。
              </label>
            </div>

            {!agreedTerms && (
              <p className="text-xs text-orange-700 mt-1">
                ※ 完了するには利用規約への同意が必要です
              </p>
            )}
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
            {isLastStep ? (
              <span>利用規約への同意が必要です</span>
            ) : (
              <a href="/student/dashboard" className="hover:underline">
                後で設定する
              </a>
            )}
          </div>

          <button
            className={`px-4 py-2 text-sm rounded text-white ${
              canComplete ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
            onClick={onSaveStep}
            disabled={!canComplete}
            title={!canComplete ? '利用規約への同意が必要です' : undefined}
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
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
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
      <input
        className="w-full border rounded-md px-3 py-2 bg-gray-50"
        value={value ?? ''}
        readOnly
      />
    </div>
  );
}