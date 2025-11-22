"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type DocRow = {
  id: string;
  doc_type: "transcript" | "certificate" | null;
  title: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  path: string;
  created_at: string;
};

export default function StudentDocuments({ studentId }: { studentId: string }) {
  const sb = createSupabaseBrowser();
  const [list, setList] = useState<DocRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await sb
        .from("student_documents")
        .select(
          "id,doc_type,title,file_name,mime_type,size_bytes,path,created_at"
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) setErr(error.message);
        setList((data ?? []) as DocRow[]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sb, studentId]);

  /**
   * 表示ボタン：ダウンロードAPIに docId だけ渡して 302 リダイレクトで開く
   * fetch は不要。Cookie も自動で同送されるので認証周りのずれが起きない。
   */
  function onView(row: DocRow) {
    try {
      setErr(null);
      setBusyId(row.id);
      const url = `/api/documents/download?id=${encodeURIComponent(row.id)}`;
      // 直接新しいタブで開く（署名URLに 302 で飛ぶ）
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      setErr(e?.message ?? "表示に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <h3 className="font-semibold text-primary-700">提出書類</h3>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <ul className="divide-y border rounded">
        {list.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">
                {row.title ??
                  (row.doc_type === "transcript" ? "成績証明書" : "資格証明書")}
              </p>
              <p className="text-xs text-gray-500">
                {row.file_name} / {row.mime_type ?? "?"}
                {row.size_bytes ? ` / ${Math.round(row.size_bytes / 1024)}KB` : ""}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>

            <button
              className="text-sm text-primary-600 hover:underline disabled:opacity-50"
              onClick={() => onView(row)}
              disabled={busyId === row.id}
            >
              {busyId === row.id ? "生成中…" : "表示"}
            </button>
          </li>
        ))}

        {list.length === 0 && (
          <li className="px-3 py-6 text-sm text-gray-500 text-center">
            まだ提出がありません
          </li>
        )}
      </ul>
    </section>
  );
}