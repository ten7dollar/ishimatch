"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = {
  /** 学生の Supabase UID（page.tsx から渡される） */
  studentId: string;
};

type SignUploadResponse = {
  ok: boolean;
  url?: string;      // 署名付き PUT URL（Storage に直接 PUT する）
  path?: string;     // 実際に保存される Storage パス (documents/{uid}/...)
  error?: string;
};

/**
 * 成績証明書・資格証明書のアップロード UI
 * - 署名付きアップロードURLをAPIから取得 → StorageにPUT → student_documentsへINSERT
 */
export default function UploadDocuments({ studentId }: Props) {
  const supabase = createSupabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "transcript" | "certificate"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage(null);

    try {
      // 1) 署名付きアップロードURLをAPIから取得
      const signRes = await fetch("/api/documents/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,                // "transcript" | "certificate"
          filename: file.name, // オリジナル名（API側で安全なパスに変換）
          contentType: file.type ?? "application/octet-stream",
        }),
        credentials: "include",
      });

      const signJson = (await signRes.json()) as SignUploadResponse;
      if (!signRes.ok || !signJson.ok || !signJson.url || !signJson.path) {
        throw new Error(signJson.error || "failed to get signed upload url");
      }

      // 2) 取得した署名付きURLへ PUT（Content-Type はそのまま付与）
      const putRes = await fetch(signJson.url, {
        method: "PUT",
        headers: { "Content-Type": file.type ?? "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`upload failed (${putRes.status})`);
      }

      // 3) DB に記録（student_documents）
      const { error: insertErr } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          kind,
          path: signJson.path,     // Storage 上の保存パス
          title: file.name,        // 表示用タイトル（元ファイル名）
          file_name: file.name,    // 任意：元ファイル名を保持
          mime_type: file.type || null,
        });
      if (insertErr) throw insertErr;

      setMessage("アップロードしました。");
      // 成功後は input の値をクリア（同じファイルを続けて選んでも onChange が発火するように）
      e.currentTarget.value = "";
    } catch (err: any) {
      setMessage(`アップロードに失敗しました: ${err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">成績証明書（PDF / 画像）</label>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={(e) => handleSelect(e, "transcript")}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">資格証明書（PDF / 画像）</label>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={(e) => handleSelect(e, "certificate")}
        />
      </div>

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}