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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await sb
        .from("student_documents")
        .select("id,doc_type,title,file_name,mime_type,size_bytes,path,created_at")
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

  return (
    <section className="card p-4 space-y-3">
      <h3 className="font-semibold text-primary-700">提出書類</h3>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <ul className="divide-y border rounded">
        {list.map((row) => {
          const title = row.title ?? (row.doc_type === "transcript" ? "成績証明書" : "資格証明書");
          const size = row.size_bytes ? ` / ${Math.round(row.size_bytes / 1024)}KB` : "";
          const created = new Date(row.created_at).toLocaleString();
          const href = `/api/documents/download?id=${encodeURIComponent(row.id)}`;

          return (
            <li key={row.id} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{title}</p>
                <p className="text-xs text-gray-500">
                  {row.file_name} / {row.mime_type ?? "?"}{size}
                </p>
                <p className="text-xs text-gray-400">{created}</p>
              </div>
              {/* aタグで単純に遷移（サーバが 302 で署名URLへリダイレクト） */}
              <a
                href={href}
                target="_blank"
                rel="noopener"
                className="text-sm text-primary-600 hover:underline"
              >
                表示
              </a>
            </li>
          );
        })}

        {list.length === 0 && (
          <li className="px-3 py-6 text-sm text-gray-500 text-center">まだ提出がありません</li>
        )}
      </ul>
    </section>
  );
}