// app/student/resume/_components/UploadDocuments.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = { studentId: string };
type Kind = "transcript" | "certificate";

type DocRow = {
  id: string;
  doc_type: Kind;
  title: string;
  file_name: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const ACCEPT = "application/pdf,image/*";

export default function UploadDocuments({ studentId }: Props) {
  const sb = useMemo(() => createSupabaseBrowser(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<DocRow[]>([]);

  /** 一覧リロード */
  const refresh = async () => {
    const { data, error } = await sb
      .from("student_documents")
      .select("id,doc_type,title,file_name,path,mime_type,size_bytes,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (!error) setList((data ?? []) as DocRow[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  /** プレビュー（認可は /api/documents/view-url が判断） */
  const onPreview = async (row: DocRow) => {
    try {
      setBusy(true);
      const r = await fetch("/api/documents/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, path: row.path }),
      });
      const j = await r.json();
      if (!r.ok || !j?.url) throw new Error(j?.error || "failed");
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(`表示に失敗しました: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  /** 削除（Storage → DB の順に） */
  const onDelete = async (row: DocRow) => {
    if (!confirm(`「${row.title} / ${row.file_name}」を削除しますか？`)) return;
    setBusy(true);
    setMessage(null);
    try {
      // Storage から削除
      const { error: sErr } = await sb.storage.from("documents").remove([row.path]);
      if (sErr) throw sErr;

      // DB から削除
      const { error: dErr } = await sb
        .from("student_documents")
        .delete()
        .eq("id", row.id)
        .eq("student_id", studentId);
      if (dErr) throw dErr;

      await refresh();
      setMessage("削除しました。");
    } catch (e: any) {
      setMessage(`削除に失敗しました: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  /** アップロード */
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>, kind: Kind) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ★ React 合成イベントは await 後に破棄されるため、先に退避しておく
    const inputEl = e.currentTarget;

    setBusy(true);
    setMessage(null);

    try {
      // 1) 署名付きアップロードURLを発行（本人のみ）
      const r = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, kind, filename: file.name }),
      });
      const j = await r.json();
      if (!r.ok || !j?.signedUrl || !j?.path) {
        throw new Error(j?.error || "failed to issue upload url");
      }

      // 2) Storage に直接 PUT
      const put = await fetch(j.signedUrl as string, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) DB に記録（student_documents）
      const { error } = await sb
        .from("student_documents")
        .insert({
          student_id: studentId,
          doc_type: kind,                        // ← カラム名は doc_type
          title: kind === "transcript" ? "成績証明書" : "資格証明書",
          file_name: file.name,
          path: j.path,                          // 例: {uid}/transcript/169..._xxx.pdf
          mime_type: file.type || null,
          size_bytes: file.size,
        });
      if (error) throw error;

      await refresh();
      setMessage("アップロードしました。");

      // 4) input の値をクリア（退避した inputEl を使う）
      if (inputEl) inputEl.value = "";
    } catch (err: any) {
      setMessage(`アップロードに失敗しました: ${err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* アップロード UI */}
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
      <div>
        <h4 className="font-semibold text-primary-700 mb-2">アップロード済み</h4>
        <ul className="divide-y border rounded">
          {list.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {row.title} <span className="text-gray-500 ml-2">({row.doc_type})</span>
                </p>
                <p className="text-xs text-gray-500">
                  {row.file_name} / {row.mime_type ?? "?"} / {(row.size_bytes ?? 0).toLocaleString()} bytes
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() => onPreview(row)}
                  disabled={busy}
                >
                  表示
                </button>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => onDelete(row)}
                  disabled={busy}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-3 py-6 text-center text-gray-500 text-sm">まだアップロードはありません</li>
          )}
        </ul>
      </div>
    </section>
  );
}