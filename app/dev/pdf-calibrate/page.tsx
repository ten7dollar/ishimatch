"use client";

import { useState, ChangeEvent } from "react";
import { buildPdf, DEFAULT_COORDS, type CoordsOverrides, type ResumeData, type Row } from "@/app/lib/buildPdf";
import { Plus, Trash2 } from "lucide-react";

/** サンプルデータ（山田 太郎 / 医師大学 マッチ学科） */
const sampleData: ResumeData = {
  nameLast: "山田", nameFirst: "太郎",
  kanaLast: "やまだ", kanaFirst: "たろう",
  birthYear: "1998", birthMonth: "08", birthDay: "05", age: "26",
  gender: "男性", matchId: "MTCH-000000",
  addressKana: "とうきょうと ぶんきょうく ほんごう",
  addressPostcode: "123-4567", addressText: "東京都文京区本郷7-3-1",
  phoneHome: "03-1234-5678", phoneMobile: "090-1111-2222", email: "yamada.taro@example.com",
  emAddressKana: "とうきょうと としまく すがも", emAddressText: "東京都豊島区巣鴨1-1-1", emPhone: "090-3333-4444", emEmail: "emg@example.com",
  specialty: "救急・集中治療",
  education: [
    { year: "2017", month: "4", detail: "医師大学 マッチ学科 入学" },
    { year: "2023", month: "3", detail: "医師大学 マッチ学科 卒業" },
  ],
  work: [ { year: "2023", month: "4", detail: "医師大学附属病院 初期臨床研修医" } ],
  license: [ { year: "2023", month: "3", detail: "医師国家試験 合格" } ],
  health: "良好", frameType: "一般枠", dependents: "0", spouse: "なし", spouseDuty: "該当なし",
  motivation: "地域医療に貢献したいと考え、貴院を志望しました。",
  selfPr: "協調性を大切にし、患者様に寄り添う姿勢を心がけています。",
  hobbies: "ランニング、読書",
  hopes: "勤務：二交代制を希望／配属：救急／開始：4月希望",
};

export default function PdfCalibratePage() {
  const [overrides, setOverrides] = useState<CoordsOverrides>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [debug, setDebug] = useState(true);
  const [busy, setBusy] = useState(false);

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => setPhoto(rd.result as string); rd.readAsDataURL(f);
  };

  const setNum = (path: string, v: number) => {
    // path 例: "X", "kanaY", "photo.x", "edu.startY", "rightTop.healthY"
    const seg = path.split(".");
    setOverrides(prev => {
      const o: any = JSON.parse(JSON.stringify(prev || {}));
      let cur = o;
      for (let i=0;i<seg.length-1;i++) {
        cur[seg[i]] = cur[seg[i]] || {};
        cur = cur[seg[i]];
      }
      cur[seg[seg.length-1]] = v;
      return o;
    });
  };

  const gen = async () => {
    setBusy(true); setUrl(null);
    try {
      const blobUrl = await buildPdf(sampleData, photo, { overrides, debug });
      setUrl(blobUrl);
    } finally { setBusy(false); }
  };

  const reset = () => setOverrides({});

  const RowNumber = ({ label, path, ph }: { label: string; path: string; ph?: string }) => {
    // 初期値は DEFAULT_COORDS から取得（あれば）
    const val = getValueFromPath(DEFAULT_COORDS as any, path) as number | undefined;
    const current = getValueFromPath(overrides as any, path) as number | undefined;
    return (
      <div className="flex items-center gap-2">
        <label className="w-56 text-sm text-gray-700">{label}</label>
        <input
          type="number" step="0.5"
          className="border rounded p-1 w-32"
          placeholder={ph || (val !== undefined ? String(val) : "")}
          value={current ?? ""}
          onChange={(e)=> setNum(path, parseFloat(e.target.value))}
        />
        <button className="px-2 py-1 border rounded text-xs" onClick={()=> setNum(path, (current ?? val ?? 0) - 0.5)}>-0.5</button>
        <button className="px-2 py-1 border rounded text-xs" onClick={()=> setNum(path, (current ?? val ?? 0) + 0.5)}>+0.5</button>
      </div>
    );
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-bold">PDF座標キャリブレーター（ライブ微調整）</h1>
      <p className="text-sm text-gray-600">数値（mm）を変更→「プレビュー生成」で即反映。ハマった値を <code>buildPdf.ts</code> の <code>DEFAULT_COORDS</code> に転記してください。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左：数値入力 */}
        <section className="space-y-4 border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold">■ 左ページ</h2>
          <RowNumber label="左ページ基準 X (X)" path="X" />
          <RowNumber label="ふりがな Y (kanaY)" path="kanaY" />
          <RowNumber label="氏名 Y (nameY)" path="nameY" />
          <RowNumber label="生年月日 Y (birthY)" path="birthY" />
          <RowNumber label="性別 X (genderX)" path="genderX" />
          <RowNumber label="マッチID X (matchIdX)" path="matchIdX" />
          <RowNumber label="マッチID Y (matchIdY)" path="matchIdY" />
          <RowNumber label="住所ふりがな Y (addrKanaY)" path="addrKanaY" />
          <RowNumber label="住所 Y (addrY)" path="addrY" />
          <RowNumber label="電話 Y (telY)" path="telY" />
          <RowNumber label="E-mail Y (mailY)" path="mailY" />
          <RowNumber label="緊急連絡先ふりがな Y (emKanaY)" path="emKanaY" />
          <RowNumber label="緊急連絡先 Y (emY)" path="emY" />
          <RowNumber label="希望診療科 Y (specialtyY)" path="specialtyY" />
          <h3 className="mt-2 font-semibold">写真（mm）</h3>
          <RowNumber label="写真 X (photo.x)" path="photo.x" />
          <RowNumber label="写真 Y (photo.y)" path="photo.y" />
          <RowNumber label="写真 幅 (photo.w)" path="photo.w" />
          <RowNumber label="写真 高 (photo.h)" path="photo.h" />

          <h3 className="mt-4 font-semibold">学歴テーブル</h3>
          <RowNumber label="1行目 Y (edu.startY)" path="edu.startY" />
          <RowNumber label="行間 gap (edu.gap)" path="edu.gap" />
          <RowNumber label="年 X (edu.yearX)" path="edu.yearX" />
          <RowNumber label="月 X (edu.monthX)" path="edu.monthX" />
          <RowNumber label="内容 X (edu.detailX)" path="edu.detailX" />

          <h2 className="mt-6 font-semibold">■ 右ページ</h2>
          <RowNumber label="右ページ基準 X (RX)" path="RX" />
          <h3 className="font-semibold">右上：本人情報</h3>
          <RowNumber label="健康状態 Y" path="rightTop.healthY" />
          <RowNumber label="枠区分 Y"    path="rightTop.frameY" />
          <RowNumber label="扶養家族数 Y" path="rightTop.dependY" />
          <RowNumber label="配偶者 Y"    path="rightTop.spouseY" />
          <RowNumber label="扶養義務 Y"  path="rightTop.spouseDutyY" />
          <RowNumber label="マッチID Y"  path="rightTop.matchIdY" />
          <RowNumber label="希望診療科 Y" path="rightTop.deptY" />

          <h3 className="font-semibold">右中：志望動機/PR/趣味</h3>
          <RowNumber label="志望動機 Y" path="rightMid.motY" />
          <RowNumber label="自己PR Y"   path="rightMid.prY" />
          <RowNumber label="趣味特技 Y" path="rightMid.hobY" />
          <RowNumber label="右中ブロックの幅 (mm)" path="rightMid.width" />

          <h3 className="font-semibold">右下：本人希望欄</h3>
          <RowNumber label="希望欄 Y"    path="rightBottom.hopesY" />
          <RowNumber label="希望欄 幅 (mm)" path="rightBottom.width" />

          <div className="pt-2 flex items-center gap-3">
            <label className="text-sm">
              <input type="checkbox" checked={debug} onChange={(e)=>setDebug(e.target.checked)} className="mr-1"/>
              デバッグガイドを表示（方眼・ラベル）
            </label>
            <button onClick={reset} className="px-2 py-1 border rounded text-xs">オーバーライドを全解除</button>
          </div>

          <div className="pt-3">
            <label className="text-sm text-gray-700">本人画像（任意）：</label>
            <input type="file" accept="image/*" onChange={onPhoto}/>
          </div>

          <div className="pt-4">
            <button
              onClick={gen}
              disabled={busy}
              className="px-4 py-2 bg-emerald-700 text-white rounded"
            >
              {busy ? "生成中..." : "プレビュー生成"}
            </button>
          </div>
        </section>

        {/* 右：プレビュー */}
        <section className="space-y-2">
          <h2 className="text-[14px] font-semibold">プレビュー</h2>
          {url ? (
            <div className="h-[900px] border rounded overflow-hidden">
              <iframe src={url} className="w-full h-full" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">左の数値を調整して「プレビュー生成」を押すと表示されます。</p>
          )}
        </section>
      </div>
    </main>
  );
}

/* ===== 小さなUIユーティリティ ===== */
function getValueFromPath(obj: any, path: string) {
  const seg = path.split(".");
  let cur = obj;
  for (const s of seg) { if (cur == null) return undefined; cur = cur[s]; }
  return cur;
}