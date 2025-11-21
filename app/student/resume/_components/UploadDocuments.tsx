"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = {
  /** 学生の Supabase UID（page.tsx から渡される） */
  studentId: string;
};

/**
 * 成績証明書・資格証明書のアップロード UI
 * - 署名付きURLをAPIから取得 → StorageにPUT → student_documentsへINSERT
 */
export default function UploadDocuments({ studentId }: Props) {
  const supabase = createSupabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "transcript" | "certificate"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage(null);

    try {
      // 1) 署名付きURLを発行（拡張子などは API 側でバリデーション）
      const res = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "failed to get signed url");
      }
      const { url, path } = (await res.json()) as { url: string; path: string };

      // 2) Storage に PUT
      const put = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) DB に記録（student_documents）
      const { error } = await supabase
        .from("student_documents")
        .insert({ student_id: studentId, kind, path });
      if (error) throw error;

      setMessage("アップロードしました。");
      // 成功後は input の値をクリア
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
          onChange={(e) => onFileChange(e, "transcript")}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">資格証明書（PDF / 画像）</label>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={(e) => onFileChange(e, "certificate")}
        />
      </div>

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}