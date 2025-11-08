"use client";

import React, { useState, ChangeEvent } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

/* ====== 型定義（buildPdf.ts の型を再掲して自己完結させます） ====== */
type Row = { year: string; month: string; detail: string };
type ResumeData = {
  nameLast: string; nameFirst: string;
  kanaLast: string; kanaFirst: string;
  birthYear: string; birthMonth: string; birthDay: string; age: string; gender: string;
  matchId: string;
  addressKana: string; addressPostcode: string; addressText: string;
  phoneHome: string; phoneMobile: string; email: string;
  emAddressKana: string; emAddressText: string; emPhone: string; emEmail: string;
  specialty: string;
  education: Row[]; work: Row[]; license: Row[];
  health: string; frameType: string; dependents: string; spouse: string; spouseDuty: string;
  motivation: string; selfPr: string; hobbies: string;
  hopes: string;
};

/* ====== API へ POST（サーバ経由でGASへ） ====== */
async function exportToGoogleSheetViaProxy(data: ResumeData) {
  const res = await fetch("/api/sheet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data), // tokenはサーバ側で付与
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "failed to write sheet");
  return json as { ok: true; sheetUrl: string; pdfUrl: string; fileId: string };
}

/* =========================================================
   ステップ式 UI → 最終ステップに「スプレッドシートへ出力」ボタン
   （PDFは座標調整不要。スプレッドシートに転記する方針）
========================================================= */

export default function ResumeInputPage() {
  /* ========== ① 基本情報 + 本人画像 + 希望診療科 ========== */
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => setPhotoDataUrl(rd.result as string); rd.readAsDataURL(f);
  };

  const [nameLast, setNameLast] = useState("山田");
  const [nameFirst, setNameFirst] = useState("太郎");
  const [kanaLast, setKanaLast] = useState("やまだ");
  const [kanaFirst, setKanaFirst] = useState("たろう");
  const [birthYear, setBirthYear] = useState("1998");
  const [birthMonth, setBirthMonth] = useState("08");
  const [birthDay, setBirthDay] = useState("05");
  const [age, setAge] = useState("26");
  const [gender, setGender] = useState("男性");
  const [matchId, setMatchId] = useState("MTCH-000000");

  const [addressKana, setAddressKana] = useState("とうきょうと ぶんきょうく ほんごう");
  const [addressPostcode, setAddressPostcode] = useState("123-4567");
  const [addressText, setAddressText] = useState("東京都文京区本郷7-3-1");
  const [phoneHome, setPhoneHome] = useState("03-1234-5678");
  const [phoneMobile, setPhoneMobile] = useState("090-1111-2222");
  const [email, setEmail] = useState("yamada.taro@example.com");

  const [emAddressKana, setEmAddressKana] = useState("とうきょうと としまく すがも");
  const [emAddressText, setEmAddressText] = useState("東京都豊島区巣鴨1-1-1");
  const [emPhone, setEmPhone] = useState("090-3333-4444");
  const [emEmail, setEmEmail] = useState("emg@example.com");

  const [specialty, setSpecialty] = useState("救急・集中治療");

  /* ========== ② 学歴・職歴・免許/資格（カード追加式） ========== */
  const [educationCards, setEducationCards] = useState<Row[]>([
    { year: "2017", month: "4", detail: "医師大学 マッチ学科 入学" },
    { year: "2023", month: "3", detail: "医師大学 マッチ学科 卒業" },
  ]);
  const [workCards, setWorkCards] = useState<Row[]>([
    { year: "2023", month: "4", detail: "医師大学附属病院 初期臨床研修医" },
  ]);
  const [licenseCards, setLicenseCards] = useState<Row[]>([
    { year: "2023", month: "3", detail: "医師国家試験 合格" },
  ]);

  const addCard = (setter: React.Dispatch<React.SetStateAction<Row[]>>) => setter(p => [...p, {year:"",month:"",detail:""}]);
  const removeCard = (setter: React.Dispatch<React.SetStateAction<Row[]>>, i:number) => setter(p => p.filter((_,idx)=>idx!==i));
  const updateCard = (setter: React.Dispatch<React.SetStateAction<Row[]>>, i:number, field:keyof Row, val:string) =>
    setter(p => p.map((r,idx)=> idx===i ? {...r,[field]:val} : r));

  /* ========== ③ 本人情報 ========== */
  const [health, setHealth] = useState("良好");
  const [frameType, setFrameType] = useState("一般枠");
  const [dependents, setDependents] = useState("0");
  const [spouse, setSpouse] = useState("なし");
  const [spouseDuty, setSpouseDuty] = useState("該当なし");

  /* ========== ④ 志望動機・自己PR・趣味特技 ========== */
  const [motivation, setMotivation] = useState("地域医療に貢献したいと考え、貴院を志望しました。");
  const [selfPr, setSelfPr] = useState("協調性を大切にし、患者様に寄り添う姿勢を心がけています。");
  const [hobbies, setHobbies] = useState("ランニング、読書");

  /* ========== ⑤ 本人希望欄 ========== */
  const [hopes, setHopes] = useState("勤務：二交代制を希望／配属：救急／開始：4月希望");

  /* ========== ステップ管理 ========== */
  const steps = [
    "① 基本情報・本人画像",
    "② 学歴・職歴・免許/資格",
    "③ 本人情報",
    "④ 志望動機・自己PR・趣味特技",
    "⑤ 本人希望欄・出力",
  ] as const;
  const [step, setStep] = useState(0);
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const [busy, setBusy] = useState(false);

  /* ========== 最終ステップ：スプレッドシートへ出力 ========== */
const handleExportSheet = async () => {
  try {
    setBusy(true);

    const payload: ResumeData = {
      // ← ここにあなたの入力値（useState）をそのまま詰める
      nameLast, nameFirst, kanaLast, kanaFirst,
      birthYear, birthMonth, birthDay, age, gender,
      matchId,
      addressKana, addressPostcode, addressText,
      phoneHome, phoneMobile, email,
      emAddressKana, emAddressText, emPhone, emEmail,
      specialty,
      education: educationCards,
      work: workCards,
      license: licenseCards,
      health, frameType, dependents, spouse, spouseDuty,
      motivation, selfPr, hobbies,
      hopes,
    };

    const res = await fetch("/api/sheet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!json.ok) {
      // ★ ここでGASの生本文（HTML/テキスト）を表示：原因が見える
      if (json.text) alert(json.text.slice(0, 800));
      else alert(json.error || "unknown error");
      return;
    }

    window.location.href = json.sheetUrl; // ✅ 複製シートへ遷移
  } catch (e:any) {
    alert(e.message ?? "スプレッドシート出力でエラーが発生しました");
  } finally {
    setBusy(false);
  }
};

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-bold">履歴書（ステップ入力 → スプレッドシート出力）</h1>

      {/* 進捗バー */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i<=step ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-600"}`}>{i+1}</div>
            <div className={`text-sm ${i===step ? "text-emerald-800 font-semibold":"text-gray-600"}`}>{s}</div>
            {i<steps.length-1 && <div className="w-8 h-[2px] bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* 入力本体 */}
      <div className="border rounded-xl p-5 bg-white shadow-sm space-y-6">
        {/* ① */}
        {step===0 && (
          <>
            <SectionTitle>① 基本情報・本人画像</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="氏名（姓）" value={nameLast} onChange={setNameLast} ph="（例：山田）"/>
              <Field label="氏名（名）" value={nameFirst} onChange={setNameFirst} ph="（例：太郎）"/>
              <Field label="ふりがな（姓）" value={kanaLast} onChange={setKanaLast} ph="（例：やまだ）"/>
              <Field label="ふりがな（名）" value={kanaFirst} onChange={setKanaFirst} ph="（例：たろう）"/>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">生年月日（西暦）</label>
                <div className="flex gap-2 items-center">
                  <InputSmall value={birthYear} onChange={setBirthYear} ph="（例：1998）"/>年
                  <InputTiny value={birthMonth} onChange={setBirthMonth} ph="（例：08）"/>月
                  <InputTiny value={birthDay} onChange={setBirthDay} ph="（例：05）"/>日（満）
                  <InputTiny value={age} onChange={setAge} ph="（例：26）"/>歳
                </div>
              </div>

              <Field label="性別" value={gender} onChange={setGender} ph="（例：男性）"/>
              <Field label="マッチングID" value={matchId} onChange={setMatchId} ph="（例：MTCH-000000）"/>
              <Field label="住所（ふりがな）" value={addressKana} onChange={setAddressKana} ph="（例：とうきょうと ぶんきょうく ほんごう）"/>
              <Field label="郵便番号" value={addressPostcode} onChange={setAddressPostcode} ph="（例：123-4567）"/>
              <div className="md:col-span-2">
                <Field label="住所" value={addressText} onChange={setAddressText} ph="（例：東京都文京区本郷7-3-1）"/>
              </div>
              <Field label="固定電話" value={phoneHome} onChange={setPhoneHome} ph="（例：03-1234-5678）"/>
              <Field label="携帯電話" value={phoneMobile} onChange={setPhoneMobile} ph="（例：090-1111-2222）"/>
              <div className="md:col-span-2">
                <Field label="E-mail" value={email} onChange={setEmail} ph="（例：yamada.taro@example.com）"/>
              </div>
              <Field label="緊急連絡先（住所ふりがな）" value={emAddressKana} onChange={setEmAddressKana} ph="（例：とうきょうと としまく すがも）"/>
              <div className="md:col-span-2">
                <Field label="緊急連絡先（住所）" value={emAddressText} onChange={setEmAddressText} ph="（例：東京都豊島区巣鴨1-1-1）"/>
              </div>
              <Field label="緊急連絡先（TEL）" value={emPhone} onChange={setEmPhone} ph="（例：090-3333-4444）"/>
              <Field label="緊急連絡先（E-mail）" value={emEmail} onChange={setEmEmail} ph="（例：emg@example.com）"/>
              <div className="md:col-span-2">
                <Field label="希望診療科名" value={specialty} onChange={setSpecialty} ph="（例：救急・集中治療）"/>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">本人画像（4×3cm）</label>
                <input type="file" accept="image/*" onChange={handlePhoto}/>
                {photoDataUrl && (
                  <div className="mt-3 w-[140px] h-[180px] border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoDataUrl} alt="photo" className="w-full h-full object-cover"/>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ② 学歴・職歴・免許/資格 */}
        {step===1 && (
          <>
            <SectionTitle>② 学歴・職歴・免許/資格（カード追加）</SectionTitle>
            <CardList title="学歴" rows={educationCards}
              onAdd={()=>addCard(setEducationCards)}
              onRemove={(i)=>removeCard(setEducationCards,i)}
              onUpdate={(i,f,v)=>updateCard(setEducationCards,i,f,v)}
              yPh="（年）例：2017" mPh="（月）例：4" detailPh="（内容）例：医師大学 マッチ学科 入学"
            />
            <CardList title="職歴" rows={workCards}
              onAdd={()=>addCard(setWorkCards)}
              onRemove={(i)=>removeCard(setWorkCards,i)}
              onUpdate={(i,f,v)=>updateCard(setWorkCards,i,f,v)}
              yPh="（年）例：2023" mPh="（月）例：4" detailPh="（内容）例：医師大学附属病院 初期臨床研修医"
            />
            <CardList title="免許・資格" rows={licenseCards}
              onAdd={()=>addCard(setLicenseCards)}
              onRemove={(i)=>removeCard(setLicenseCards,i)}
              onUpdate={(i,f,v)=>updateCard(setLicenseCards,i,f,v)}
              yPh="（年）例：2023" mPh="（月）例：3" detailPh="（内容）例：医師国家試験 合格"
            />
          </>
        )}

        {/* ③ 本人情報 */}
        {step===2 && (
          <>
            <SectionTitle>③ 本人情報</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="健康状態" value={health} onChange={setHealth} ph="（例：良好）"/>
              <Field label="区分（一般枠 or 地域枠）" value={frameType} onChange={setFrameType} ph="（例：一般枠）"/>
              <Field label="扶養家族数（配偶者除く）" value={dependents} onChange={setDependents} ph="（例：0）"/>
              <Field label="配偶者（有/なし）" value={spouse} onChange={setSpouse} ph="（例：なし）"/>
              <Field label="配偶者の扶養義務" value={spouseDuty} onChange={setSpouseDuty} ph="（例：該当なし）"/>
            </div>
          </>
        )}

        {/* ④ 志望動機・自己PR・趣味特技 */}
        {step===3 && (
          <>
            <SectionTitle>④ 志望動機・自己PR・趣味/特技（各600字以内）</SectionTitle>
            <TextArea label="志望動機" value={motivation} onChange={setMotivation} ph="（600字以内）" rows={8}/>
            <TextArea label="自己PR"   value={selfPr}    onChange={setSelfPr}    ph="（600字以内）" rows={10}/>
            <TextArea label="趣味・特技" value={hobbies} onChange={setHobbies} ph="（600字以内）" rows={6}/>
          </>
        )}

        {/* ⑤ 本人希望欄 + 出力ボタン */}
        {step===4 && (
          <>
            <SectionTitle>⑤ 本人希望欄・出力</SectionTitle>
            <TextArea label="本人希望欄" value={hopes} onChange={setHopes} ph="（例：勤務：二交代制を希望／配属：救急／開始：4月希望）" rows={6}/>

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={handleExportSheet}
                disabled={busy}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm"
              >
                {busy ? "出力中..." : "スプレッドシートへ出力"}
              </button>
            </div>
          </>
        )}

        {/* ステップ移動 */}
        <div className="flex justify-between">
          <button onClick={()=>setStep(s=>Math.max(s-1,0))} disabled={step===0} className="px-4 py-2 border rounded text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4"/> 前へ
          </button>
          <button onClick={()=>setStep(s=>Math.min(s+1,steps.length-1))} disabled={step===steps.length-1} className="px-4 py-2 bg-emerald-700 text-white rounded text-sm flex items-center gap-1">
            次へ <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </main>
  );
}

/* ===== 小さなUI部品 ===== */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[14px] font-semibold">{children}</h2>;
}
function Field({ label, value, onChange, ph }:{
  label:string; value:string; onChange:(v:string)=>void; ph?:string;
}) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input className="border p-2 rounded text-sm w-full" placeholder={ph} value={value} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}
function TextArea({ label, value, onChange, ph, rows=6 }:{
  label:string; value:string; onChange:(v:string)=>void; ph?:string; rows?:number;
}) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <textarea className="border p-2 rounded text-sm w-full" placeholder={ph} value={value} onChange={(e)=>onChange(e.target.value)} rows={rows}/>
    </div>
  );
}
function InputSmall({ value, onChange, ph }:{ value:string; onChange:(v:string)=>void; ph?:string }) {
  return (
    <input className="border p-2 w-24 rounded text-sm" placeholder={ph} value={value} onChange={(e)=>onChange(e.target.value)} />
  );
}
function InputTiny({ value, onChange, ph }:{ value:string; onChange:(v:string)=>void; ph?:string }) {
  return (
    <input className="border p-2 w-12 rounded text-sm" placeholder={ph} value={value} onChange={(e)=>onChange(e.target.value)} />
  );
}
function CardList({
  title, rows, onAdd, onRemove, onUpdate, yPh, mPh, detailPh,
}:{
  title:string;
  rows:Row[];
  onAdd:()=>void;
  onRemove:(i:number)=>void;
  onUpdate:(i:number, f:keyof Row, v:string)=>void;
  yPh:string; mPh:string; detailPh:string;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold mb-2">{title}</h3>
      {rows.map((r,i)=>(
        <div key={i} className="flex gap-2 mb-2 items-center">
          <input className="border p-2 w-24 rounded text-sm" placeholder={yPh} value={r.year}  onChange={(e)=>onUpdate(i,"year", e.target.value)} />
          <input className="border p-2 w-14 rounded text-sm" placeholder={mPh} value={r.month} onChange={(e)=>onUpdate(i,"month",e.target.value)} />
          <input className="border p-2 flex-1 rounded text-sm" placeholder={detailPh} value={r.detail} onChange={(e)=>onUpdate(i,"detail",e.target.value)} />
          <button onClick={()=>onRemove(i)} className="text-red-500"><Trash2 size={16}/></button>
        </div>
      ))}
      <button onClick={onAdd} className="text-emerald-700 text-sm flex items-center gap-1 mt-2"><Plus size={14}/> 追加</button>
    </div>
  );
}