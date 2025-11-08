"use client";

import { useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// public 配下の実ファイルパス
const TEMPLATE_PATH = "/templates/resume-template.pdf";
const FONT_PATH     = "/fonts/NotoSansCJKjp-Regular.otf"; // ← OTFフォント使用

export default function PdfTestPage() {
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const testPdf = async () => {
    setBusy(true);
    setError(null);
    setPdfUrl(null);
    try {
      // 1) テンプレPDF / フォントを取得
      const tplRes = await fetch(TEMPLATE_PATH);
      if (!tplRes.ok) throw new Error(`PDF not found: ${TEMPLATE_PATH}`);
      const tplBytes = await tplRes.arrayBuffer();

      const fontRes = await fetch(FONT_PATH);
      if (!fontRes.ok) throw new Error(`Font not found: ${FONT_PATH}`);
      const fontBytes = await fontRes.arrayBuffer();

      // 2) pdf-lib でテンプレ読込 + fontkit登録 + フォント埋込
      const pdfDoc = await PDFDocument.load(tplBytes);
      pdfDoc.registerFontkit(fontkit);
      const font = await pdfDoc.embedFont(fontBytes, { subset: false }); // ★ subset:false が超重要

      // 3) 1ページ目に日本語テキストを描画
      const page = pdfDoc.getPages()[0];
      page.drawText("フォントOK：山田 太郎（やまだ たろう）", {
        x: 100,
        y: 500, // 座標（下が0）なので中央やや上くらい
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      // 4) Blob + ObjectURL でプレビュー（iframe表示 & リンクあり）
      const bytes = await pdfDoc.save(); // Uint8Array
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const blob = new Blob([ab as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-lg font-bold">PDF フォント埋め込みテスト（pdf-lib + fontkit + OTF）</h1>
      <p className="text-sm text-gray-600">
        public/templates のPDFに日本語テキストを書き込み、ページ内のプレビューに表示します。
      </p>

      <button
        onClick={testPdf}
        disabled={busy}
        className="px-4 py-2 bg-emerald-700 text-white rounded"
      >
        {busy ? "生成中..." : "テストPDFを作る"}
      </button>

      {error && <p className="text-red-600 text-sm">エラー: {error}</p>}

      {/* iframe でプレビュー（ブロック回避） */}
      {pdfUrl && (
        <div className="space-y-2">
          <div className="h-[700px] border rounded overflow-hidden bg-gray-50">
            <iframe src={pdfUrl} className="w-full h-full" />
          </div>
          <div className="flex gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 underline"
            >
              新しいタブで開く
            </a>
            <a
              href={pdfUrl}
              download="test.pdf"
              className="text-emerald-700 underline"
            >
              ダウンロード
            </a>
          </div>
        </div>
      )}
    </main>
  );
}