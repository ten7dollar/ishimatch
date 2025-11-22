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
      // 1) 署名付きアップロードURLを発行
      const res = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // NOTE: cookie 認証が使えない環境でも動くように、studentId を同梱（MVP）
        body: JSON.stringify({ studentId, kind, filename: file.name }),
      });

      const j = await res.json();
      if (!res.ok || !j?.signedUrl || !j?.path) {
        throw new Error(j?.error || "failed to issue upload url");
      }

      // 2) Storage に PUT（signedUrl は一時URL。x-upsert は任意）
      const put = await fetch(j.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) メタを student_documents に保存（RLS で本人のみ許可）
      const { error } = await supabase.from("student_documents").insert({
        student_id: studentId,
        kind,
        path: j.path, // 例: {uid}/168...._file.pdf
        title: kind === "transcript" ? "成績証明書" : "資格証明書",
        file_name: file.name,
        mime_type: file.type || null,
      });
      if (error) throw error;

      setMessage("アップロードしました。");
      e.currentTarget.value = ""; // input reset
    } catch (err: any) {
      setMessage(
        `アップロードに失敗しました: ${err?.message ?? "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          成績証明書（PDF / 画像）
        </label>
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => handleChange(e, "transcript")}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          資格証明書（PDF / 画像）
        </label>
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => handleChange(e, "certificate")}
        />
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </section>
  );
}