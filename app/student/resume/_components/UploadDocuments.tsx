"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Kind = "transcript" | "certificate";
type Props = { studentId: string };

type DocRow = {
  id: string;
  doc_type: "transcript" | "certificate" | null;
  title: string | null;
  file_name: string | null;
  mime_type: string | null;
  path: string;
  size_bytes: number | null;
  created_at: string;
};

const ACCEPT = "application/pdf,image/*";

export default function UploadDocuments({ studentId }: Props) {
  const sb = useMemo(() => createSupabaseBrowser(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<DocRow[]>([]);

  /** 一覧読み込み */
  const reload = async () => {
    const { data, error } = await sb
      .from("student_documents")
      .select("id,doc_type,title,file_name,mime_type,path,size_bytes,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (!error) setList((data ?? []) as DocRow[]);
  };

  useEffect(() => { reload(); /* 初回 */ }, [studentId]); // eslint-disable-line

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>, kind: Kind) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      // 1) 署名付きアップロード URL を発行
      const r = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, kind, filename: file.name }),
      });
      const j = await r.json();
      if (!r.ok || !j?.signedUrl || !j?.path) throw new Error(j?.error || "failed to issue upload url");

      // 2) 直接 PUT（Content-Type は file.type）
      const put = await fetch(j.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("upload failed");

      // 3) DB に記録
      const { error } = await sb.from("student_documents").insert({
        student_id: studentId,
        doc_type  : kind,                                // ← doc_type(enum)
        title     : kind === "transcript" ? "成績証明書" : "資格証明書",
        file_name : file.name,
        mime_type : file.type || null,
        size_bytes: file.size,
        path      : j.path,                               // 例: {uid}/transcript/1699_xxx.pdf
      });
      if (error) throw error;

      setMessage("アップロードしました。");
      e.currentTarget.value = ""; // input reset
      await reload();
    } catch (err: any) {
      setMessage(`アップロードに失敗しました: ${err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  /** 削除（Storage + DB） */
  const onDelete = async (row: DocRow) => {
    if (!confirm(`「${row.file_name ?? row.title ?? "ファイル"}」を削除します。よろしいですか？`)) return;
    setBusy(true);
    try {
      // Storage 側
      await sb.storage.from("documents").remove([row.path]);
      // DB 側
      await sb.from("student_documents").delete().eq("id", row.id);
      await reload();
    } catch (e: any) {
      alert(`削除に失敗しました: ${e?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* アップロード */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">成績証明書（PDF / 画像）</label>
          <input type="file" accept={ACCEPT} disabled={busy} onChange={(e) => handleChange(e, "transcript")} />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">資格証明書（PDF / 画像）</label>
          <input type="file" accept={ACCEPT} disabled={busy} onChange={(e) => handleChange(e, "certificate")} />
        </div>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>

      {/* アップロード済み一覧 */}
      <div className="space-y-2">
        <h4 className="font-semibold text-primary-700">アップロード済み</h4>
        <ul className="divide-y border rounded">
          {list.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {row.title ?? (row.doc_type === "transcript" ? "成績証明書" : "資格証明書")}
                </p>
                <p className="text-xs text-gray-500">
                  {row.file_name} / {row.mime_type ?? "?"}
                </p>
              </div>
              <button
                className="text-sm text-red-500 hover:underline disabled:opacity-50"
                onClick={() => onDelete(row)}
                disabled={busy}
              >
                削除
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-3 py-6 text-sm text-gray-500 text-center">まだ提出がありません</li>
          )}
        </ul>
      </div>
    </section>
  );
}