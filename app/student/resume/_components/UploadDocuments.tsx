"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = {
  /** 学生の Supabase UID（page.tsx から渡される） */
  studentId: string;
};

type Preview = {
  kind: "transcript" | "certificate";
  fileName: string;
  url: string; // 署名付きURL（5分有効）
};

/**
 * 成績証明書・資格証明書のアップロード UI
 * - Storage(documents) にアップロード
 * - /api/documents/sign で閲覧用の署名URLを取得
 * - student_documents に INSERT
 */
export default function UploadDocuments({ studentId }: Props) {
  const supabase = createSupabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function onFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "transcript" | "certificate"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage(null);
    setPreview(null);

    try {
      // 1) アップロード先キー（バケット内の相対パス）を作成
      //    - 例: {uid}/transcript/1700000000000_成績証明書.pdf
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const objectPath = `${studentId}/${kind}/${Date.now()}_${safeName}`;

      // 2) Storage へアップロード（documents）
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(objectPath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // 3) 署名付きURLを取得（閲覧用 5分）
      const signRes = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, path: objectPath }),
      });

      const signJson = await signRes.json();
      if (!signRes.ok || !signJson?.ok) {
        throw new Error(signJson?.error || "failed to sign url");
      }

      const signedUrl: string = signJson.url;

      // 4) DB に記録（student_documents）
      const { error: insErr } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          kind,
          path: objectPath,
          file_name: file.name,
          content_type: file.type,
          size: file.size,
        });
      if (insErr) throw insErr;

      // 5) 画面表示（プレビューリンクなど）
      setPreview({ kind, fileName: file.name, url: signedUrl });
      setMessage("アップロードしました。");
      e.currentTarget.value = "";
    } catch (err: any) {
      setMessage(
        `アップロードに失敗しました: ${err?.message ?? "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          成績証明書（PDF / 画像）
        </label>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={(e) => onFileChange(e, "transcript")}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">
          資格証明書（PDF / 画像）
        </label>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={(e) => onFileChange(e, "certificate")}
        />
      </div>

      {preview && (
        <div className="text-sm text-gray-700">
          <span className="mr-2">直近アップロード:</span>
          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary-600 underline"
          >
            {preview.fileName}（{preview.kind === "transcript" ? "成績証明" : "資格証明"}）
          </a>
          <span className="ml-2 text-gray-500">※ リンクは数分で失効します</span>
        </div>
      )}

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}