// /app/lib/buildPdf.ts
"use client";

import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ========= ユーティリティ ========= */
const mm2pt = (mm: number) => mm * 2.83464567;

/* ========= データ型 ========= */
export type Row = { year: string; month: string; detail: string };

export interface ResumeData {
  // 左上：基本情報 + 画像 + 希望診療科
  nameLast: string; nameFirst: string;
  kanaLast: string; kanaFirst: string;
  birthYear: string; birthMonth: string; birthDay: string; age: string;
  gender: string;
  matchId: string;
  addressKana: string;                // 住所ふりがな（無ければ空文字）
  addressPostcode: string;            // 123-4567
  addressText: string;                // 住所本文
  phoneHome: string; phoneMobile: string; email: string;
  emAddressKana: string; emAddressText: string; emPhone: string; emEmail: string;
  specialty: string;

  // 左下：学歴・職歴・免許/資格（年・月・内容）
  education: Row[];
  work: Row[];
  license: Row[];

  // 右上：本人情報
  health: string;          // 健康状態
  frameType: string;       // 一般枠 / 地域枠
  dependents: string;      // 扶養家族数（配偶者除く）
  spouse: string;          // 配偶者（有/なし）
  spouseDuty: string;      // 配偶者の扶養義務（有/なし/該当なし）

  // 右中：志望動機・自己PR・趣味特技
  motivation: string;
  selfPr: string;
  hobbies: string;

  // 右下：本人希望欄
  hopes: string;
}

/* ========= テンプレ / フォントパス（public配下） ========= */
const TEMPLATE_PATH = "/templates/resume-template.pdf";
const FONT_PATH     = "/fonts/NotoSansCJKjp-Regular.otf";

/* ========= 既定座標（mm） ========= */
export type Coords = {
  X: number; kanaY: number; nameY: number; birthY: number; genderX: number;
  matchIdX: number; matchIdY: number;
  addrKanaY: number; addrY: number; telY: number; mailY: number;
  emKanaY: number; emY: number;
  specialtyX: number; specialtyY: number;
  photo: { x: number; y: number; w: number; h: number };
  edu: { startY: number; gap: number; yearX: number; monthX: number; detailX: number; maxRows: number };
  RX: number;
  rightTop: { healthY: number; frameY: number; dependY: number; spouseY: number; spouseDutyY: number; matchIdY: number; deptY: number };
  rightMid: { motY: number; prY: number; hobY: number; width: number; lineHeight: number };
  rightBottom: { hopesY: number; width: number; lineHeight: number };
};

export const DEFAULT_COORDS: Coords = {
  X: 20, kanaY: 42, nameY: 52, birthY: 62, genderX: 140,
  matchIdX: 140, matchIdY: 56,
  addrKanaY: 68, addrY: 72, telY: 80, mailY: 88,
  emKanaY: 96, emY: 102,
  specialtyX: 24, specialtyY: 110,
  photo: { x: 170, y: 26, w: 35, h: 45 },
  edu: { startY: 124, gap: 6, yearX: 16, monthX: 32, detailX: 45, maxRows: 18 },
  RX: 120,
  rightTop: { healthY: 28, frameY: 28, dependY: 36, spouseY: 36, spouseDutyY: 44, matchIdY: 52, deptY: 60 },
  rightMid:  { motY: 76, prY: 98, hobY: 132, width: 80, lineHeight: 6 },
  rightBottom:{ hopesY: 196, width: 80, lineHeight: 6 }
};

/* ========= オーバーライド型（部分的に渡せる） ========= */
export type CoordsOverrides = Partial<{
  [K in keyof Coords]: Coords[K] extends object ? Partial<Coords[K]> : Coords[K];
}>;

/* ========= デバッグ描画（方眼 / ラベル） ========= */
function drawGuideLine(page: any, x1: number, y1: number, x2: number, y2: number) {
  page.drawLine({
    start: { x: mm2pt(x1), y: page.getHeight() - mm2pt(y1) },
    end:   { x: mm2pt(x2), y: page.getHeight() - mm2pt(y2) },
    thickness: 0.3, color: rgb(0.7, 0.7, 0.7),
  });
}
function drawGuideText(page: any, txt: string, x: number, y: number) {
  page.drawText(txt, { x: mm2pt(x), y: page.getHeight() - mm2pt(y), size: 8, color: rgb(0.05,0.2,0.8) });
}
function drawGrid(page: any) {
  const margin = 10; const Wmm = 210 - margin*2; const Hmm = 297 - margin*2; const left = margin; const top = margin; const step = 5;
  for (let x=0; x<=Wmm; x+=step) drawGuideLine(page, left+x, top, left+x, top+Hmm);
  for (let y=0; y<=Hmm; y+=step) drawGuideLine(page, left, top+y, left+Wmm, top+y);
}

/* ========= ヘルパー ========= */
function drawAt(page: any, txt: string, x_mm: number, y_mm: number, font: any, size=10) {
  page.drawText(txt || "", { x: mm2pt(x_mm), y: page.getHeight()-mm2pt(y_mm), size, font, color: rgb(0,0,0) });
}
function drawWrapped(page: any, text: string, font: any, x_mm: number, y_mm: number, width_mm: number, maxLines: number, size=10, lineH=6) {
  const maxWidthPt = mm2pt(width_mm); let rest = text || ""; let yPt = page.getHeight() - mm2pt(y_mm); const lines: string[] = [];
  while (rest.length && lines.length < maxLines) {
    let low=0, high=rest.length;
    while (low<high) { const mid=Math.ceil((low+high)/2); const s=rest.slice(0,mid); const w=font.widthOfTextAtSize(s,size); if (w<=maxWidthPt) low=mid; else high=mid-1; }
    const fit = rest.slice(0, Math.max(low,1)); lines.push(fit); rest = rest.slice(fit.length);
  }
  lines.forEach((ln, idx) => page.drawText(ln, { x:mm2pt(x_mm), y:yPt-mm2pt(idx*lineH), size, font, color: rgb(0,0,0) }));
}

/* ========= COORDS にオーバーライドを適用 ========= */
function applyOverrides(base: Coords, overrides?: CoordsOverrides): Coords {
  if (!overrides) return base;
  const cloned: any = JSON.parse(JSON.stringify(base));
  const merge = (dst: any, src: any) => {
    Object.keys(src || {}).forEach((k) => {
      const v = (src as any)[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        dst[k] = dst[k] || {};
        merge(dst[k], v);
      } else {
        dst[k] = v;
      }
    });
  };
  merge(cloned, overrides);
  return cloned as Coords;
}

/* ========= buildPdf：オプションで overrides / debug を受け取る ========= */
export async function buildPdf(
  data: ResumeData,
  photoDataUrl: string | null,
  options?: { overrides?: CoordsOverrides; debug?: boolean }
): Promise<string> {
  const coords = applyOverrides(DEFAULT_COORDS, options?.overrides);

  // 1) テンプレ/フォント
  const tplBytes  = await fetch(TEMPLATE_PATH).then(r => r.arrayBuffer());
  const fontBytes = await fetch(FONT_PATH).then(r => r.arrayBuffer());

  // 2) PDF読み込み＋fontkit＋フォント埋込
  const pdfDoc = await PDFDocument.load(tplBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: false });

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const pageR = pages.length > 1 ? pages[1] : pages[0];

  /* ===== 左上：基本情報 ===== */
  const { X } = coords;
  drawAt(page1, `${data.kanaLast} ${data.kanaFirst}`, X+24, coords.kanaY, font);
  drawAt(page1, `${data.nameLast} ${data.nameFirst}`, X+24, coords.nameY, font, 12);
  drawAt(page1, `${data.birthYear}年${data.birthMonth}月${data.birthDay}日（満${data.age}歳）`, X+24, coords.birthY, font);
  drawAt(page1, data.gender, coords.genderX, coords.birthY, font);
  drawAt(page1, `ID：${data.matchId}`, coords.matchIdX, coords.matchIdY, font);

  if (data.addressKana) drawAt(page1, data.addressKana, X+24, coords.addrKanaY, font);
  drawAt(page1, `〒${data.addressPostcode} ${data.addressText}`, X+24, coords.addrY, font);
  drawAt(page1, `固定電話：${data.phoneHome}　携帯電話：${data.phoneMobile}`, X+24, coords.telY, font);
  drawAt(page1, data.email, X+24, coords.mailY, font);

  if (data.emAddressKana) drawAt(page1, data.emAddressKana, X+24, coords.emKanaY, font);
  drawAt(page1, data.emAddressText, X+24, coords.emY, font);
  drawAt(page1, `TEL：${data.emPhone}　E-mail：${data.emEmail}`, X+24, coords.emY-6, font);
  drawAt(page1, `希望診療科：${data.specialty}`, coords.specialtyX, coords.specialtyY, font);

  // 写真
  if (photoDataUrl) {
    const imgBytes = await fetch(photoDataUrl).then(r=>r.arrayBuffer());
    let img; try { img = await pdfDoc.embedJpg(imgBytes); } catch { img = await pdfDoc.embedPng(imgBytes); }
    const p = coords.photo;
    page1.drawImage(img, { x:mm2pt(p.x), y:page1.getHeight()-mm2pt(p.y+p.h), width:mm2pt(p.w), height:mm2pt(p.h) });
  }

  /* ===== 左下：学歴・職歴・資格（18行） ===== */
  const allRows: Row[] = [...data.education, ...data.work, ...data.license];
  const { startY, gap, yearX, monthX, detailX, maxRows } = coords.edu;
  for (let i = 0; i < maxRows; i++) {
    const r = allRows[i];
    if (!r) continue; // 空白は何も描かない（縦線装飾も無し）
    const y = startY + i * gap;
    drawAt(page1, r.year || "",   yearX,   y, font);
    drawAt(page1, r.month || "",  monthX,  y, font);
    drawAt(page1, r.detail || "", detailX, y, font);
  }

  /* ===== 右上：本人情報 ===== */
  const { RX, rightTop, rightMid, rightBottom } = coords;
  drawAt(pageR, `健康状態：${data.health}`, RX, rightTop.healthY, font);
  drawAt(pageR, `区分：${data.frameType}`,   RX+50, rightTop.frameY, font);
  drawAt(pageR, `扶養家族数（配偶者除く）：${data.dependents}`, RX, rightTop.dependY, font);
  drawAt(pageR, `配偶者：${data.spouse}`,   RX+50, rightTop.spouseY, font);
  drawAt(pageR, `配偶者の扶養義務：${data.spouseDuty}`, RX, rightTop.spouseDutyY, font);
  drawAt(pageR, `マッチングID：${data.matchId}`, RX, rightTop.matchIdY, font);
  drawAt(pageR, `希望診療科名：${data.specialty}`, RX, rightTop.deptY, font);

  /* ===== 右中：志望動機など（折返し） ===== */
  drawWrapped(pageR, data.motivation, font, RX, rightMid.motY, rightMid.width, 3, 10, rightMid.lineHeight);
  drawWrapped(pageR, data.selfPr,    font, RX, rightMid.prY,  rightMid.width, 8, 10, rightMid.lineHeight);
  drawWrapped(pageR, data.hobbies,   font, RX, rightMid.hobY, rightMid.width, 5, 10, rightMid.lineHeight);

  /* ===== 右下：本人希望欄 ===== */
  drawWrapped(pageR, data.hopes, font, RX, rightBottom.hopesY, rightBottom.width, 4, 10, rightBottom.lineHeight);

  /* ===== デバッグガイド（方眼＋ラベル） ===== */
  if (options?.debug) {
    drawGrid(page1); drawGrid(pageR);
    // 左ページ基準ラベル
    drawGuideText(page1, `kanaY (${coords.kanaY})`, coords.X+24, coords.kanaY);
    drawGuideText(page1, `nameY (${coords.nameY})`, coords.X+24, coords.nameY);
    drawGuideText(page1, `birthY(${coords.birthY})`,coords.X+24, coords.birthY);
    drawGuideText(page1, `addrY (${coords.addrY})`, coords.X+24, coords.addrY);
    drawGuideText(page1, `telY  (${coords.telY})`,  coords.X+24, coords.telY);
    drawGuideText(page1, `mailY(${coords.mailY})`, coords.X+24, coords.mailY);
    drawGuideText(page1, `emY  (${coords.emY})`,   coords.X+24, coords.emY);
    drawGuideText(page1, `specY(${coords.specialtyY})`, coords.specialtyX, coords.specialtyY);
    drawGuideText(page1, `EDU start(${coords.edu.startY})`, coords.edu.detailX, coords.edu.startY);
    // 右ページ
    drawGuideText(pageR, `Rtop:${rightTop.healthY}`, coords.RX, rightTop.healthY);
    drawGuideText(pageR, `Mot:${rightMid.motY}`,    coords.RX, rightMid.motY);
    drawGuideText(pageR, `PR:${rightMid.prY}`,      coords.RX, rightMid.prY);
    drawGuideText(pageR, `Hob:${rightMid.hobY}`,    coords.RX, rightMid.hobY);
    drawGuideText(pageR, `Hope:${rightBottom.hopesY}`, coords.RX, rightBottom.hopesY);
  }

  // 生成 → BlobURL を返す
  const bytes = await pdfDoc.save(); // Uint8Array
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return URL.createObjectURL(new Blob([ab], { type: "application/pdf" }));
}