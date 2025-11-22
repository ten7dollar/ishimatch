"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type DocRow = {
  id: string;
  title: string;
  path: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
};

export default function StudentDocuments({ studentId }: { studentId: string }) {
  const sb = createSupabaseBrowser();
  const [list, setList] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb
        .from("student_documents")
        .select("id,title,path,file_name,mime_type,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (!error) setList((data ?? []) as DocRow[]);
    })();
  }, [sb, studentId]);

  const onView = async (row: DocRow) => {
    try {
      setBusy(true);
      // 閲覧用の署名URLを取得（Cookie を必ず同送）
      const resp = await fetch("/api/documents/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ← 病院ログインをサーバで認識させる
        body: JSON.stringify({ studentId, path: row.path }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) throw new Error(json?.error || "failed");
      window.open(json.url as string, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(`表示に失敗しました：${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-4 space-y-3">
      <h3 className="font-semibold text-primary-700">提出書類</h3>

      <ul className="divide-y border rounded">
        {list.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{row.title}</p>
              <p className="text-xs text-gray-500">
                {row.file_name} / {row.mime_type ?? "?"}
              </p>
            </div>
            <button
              className="text-sm text-primary-600 hover:underline"
              onClick={() => onView(row)}
              disabled={busy}
            >
              表示
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