"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = { studentId: string };
type Kind = "transcript" | "certificate";

// PDF/画像のみ許可（最大 10MB など任意）
const ACCEPT = "application/pdf,image/*";

export default function UploadDocuments({ studentId }: Props) {
  const supabase = createSupabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: Kind
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage(null);

    try {
      // 1) 署名付きアップロードURLを発行（※Cookieが必要）
      const r = await fetch("/api/documents/upload-url", {
        method: "POST",
        credentials: "include", // ← これが重要
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          kind,
          filename: file.name,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.signedUrl || !j?.path) {
        throw new Error(j?.error || "failed to issue upload url");
      }

      // 2) 直接 PUT
      const put = await fetch(j.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) メタを student_documents に保存
      const { error } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          kind,
          title: kind === "transcript" ? "成績証明書" : "資格証明書",
          file_name: file.name,
          mime_type: file.type || null,
          path: j.path, // 例: {uid}/168...._file.pdf
        });
      if (error) throw error;

      setMessage("アップロードしました。");
      e.currentTarget.value = ""; // input reset
    } catch (err: any) {
      setMessage(`アップロードに失敗しました: ${err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">成績証明書（PDF / 画像）</label>
        <input type="file" accept={ACCEPT} disabled={busy} onChange={(e) => handleChange(e, "transcript")} />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">資格証明書（PDF / 画像）</label>
        <input type="file" accept={ACCEPT} disabled={busy} onChange={(e) => handleChange(e, "certificate")} />
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </section>
  );
}