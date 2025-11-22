"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type DocRow = {
  id: string;
  doc_type: "transcript" | "certificate" | null;
  title: string | null;
  file_name: string | null;
  mime_type: string | null;
  path: string;
  created_at: string;
};

export default function StudentDocuments({ studentId }: { studentId: string }) {
  const sb = createSupabaseBrowser();
  const [list, setList] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from("student_documents")
        .select("id,doc_type,title,file_name,mime_type,path,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      setList((data ?? []) as DocRow[]);
    })();
  }, [studentId]); // eslint-disable-line

  const onView = async (row: DocRow) => {
    try {
      setBusy(true);
      const resp = await fetch("/api/documents/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, path: row.path }),
        credentials: "include",
      });
      const json = await resp.json();
      if (!resp.ok || !json?.url) throw new Error(json?.error || "unauthorized");
      window.open(json.url, "_blank", "noopener");
    } catch (e: any) {
      alert(`表示に失敗しました：${e?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-4 space-y-3">
      <h3 className="font-semibold text-primary-700">提出書類</h3>
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
              className="text-sm text-primary-600 hover:underline disabled:opacity-50"
              onClick={() => onView(row)}
              disabled={busy}
            >
              表示
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="px-3 py-6 text-sm text-gray-500 text-center">まだ提出がありません</li>
        )}
      </ul>
    </section>
  );
}