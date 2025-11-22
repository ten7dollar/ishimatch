"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = { studentId: string };
type Kind = "transcript" | "certificate";

const ACCEPT = "application/pdf,image/*";

export default function UploadDocuments({ studentId }: Props) {
  const supabase = createSupabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: Kind
  ) {
    const inputEl = e.currentTarget; // ← イベントプーリング前に参照を保持
    const file = inputEl.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage(null);

    try {
      // 1) 署名付きアップロードURLを発行（本人のみ）
      const r = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ← Cookie 必須
        body: JSON.stringify({
          studentId,
          kind,
          filename: file.name,
        }),
      });

      const j = await r.json();
      if (!r.ok) {
        throw new Error(j?.error || "failed to issue upload url");
      }
      const { signedUrl, path } = j as {
        signedUrl: string;
        path: string;
      };

      // 2) 署名付きURLへ直接 PUT
      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) DB にメタ保存
      const { error } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          kind, // text
          title: kind === "transcript" ? "成績証明書" : "資格証明書",
          file_name: file.name,
          mime_type: file.type || null,
          path, // 例) {uid}/transcript/xxx.pdf
        });
      if (error) throw error;

      setMessage("アップロードしました。");
      inputEl.value = ""; // ← 保持した参照でリセット
    } catch (err: any) {
      const msg =
        err?.message === "forbidden"
          ? "権限がありません（ログイン状態や Cookie を確認してください）"
          : err?.message ?? "unknown error";
      setMessage(`アップロードに失敗しました: ${msg}`);
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