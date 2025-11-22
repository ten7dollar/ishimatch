"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

type Props = { studentId: string };
type Kind = "transcript" | "certificate";

type DocRow = {
  id: string;
  title: string;
  file_name: string;
  path: string;
  mime_type: string | null;
  created_at: string;
};

const ACCEPT = "application/pdf,image/*";

export default function UploadDocuments({ studentId }: Props) {
  const supabase = createSupabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]); // 直近の提出一覧

  // 一覧取得
  async function fetchList() {
    const { data, error } = await supabase
      .from("student_documents")
      .select("id,title,file_name,path,mime_type,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) setDocs((data ?? []) as DocRow[]);
  }
  useEffect(() => { fetchList(); /* 初回 */ }, [studentId]); // eslint-disable-line

  async function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: Kind
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // `await` の前に参照を保持しておく（アンマウントで null になるのを防ぐ）
    const inputEl = e.currentTarget;

    setBusy(true);
    setMessage(null);

    try {
      // 1) 署名付きアップロードURLを発行（cookie を送る！）
      const r = await fetch("/api/documents/upload-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, kind, filename: file.name }),
      });
      const j = await r.json();
      if (!r.ok || !j?.signedUrl || !j?.path) {
        throw new Error(j?.error || "failed to issue upload url");
      }

      // 2) Storage に PUT
      const put = await fetch(j.signedUrl as string, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) DB に記録
      const { error } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          doc_type: kind,               // ここは DB 側の列名に合わせる（kind で作った場合は `kind` に）
          title: kind === "transcript" ? "成績証明書" : "資格証明書",
          file_name: file.name,
          mime_type: file.type || null,
          path: j.path,
        } as any);
      if (error) throw error;

      setMessage(`「${file.name}」をアップロードしました。`);
      await fetchList();                     // 一覧を更新
      if (inputEl) inputEl.value = "";       // input をクリア
    } catch (err: any) {
      setMessage(`アップロードに失敗しました: ${err?.message ?? "unknown error"}`);
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

      {/* 直近アップロード一覧（確認用） */}
      <div className="border rounded">
        <div className="px-3 py-2 text-sm font-semibold bg-gray-50">アップロード済み</div>
        {docs.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-500">まだ提出はありません</p>
        ) : (
          <ul className="divide-y">
            {docs.map((d) => (
              <li key={d.id} className="px-3 py-2 text-sm flex gap-3 min-w-0">
                <span className="shrink-0 text-gray-500">{d.title}</span>
                <span className="truncate text-gray-800">{d.file_name}</span>
                <span className="ml-auto shrink-0 text-gray-500">
                  {new Date(d.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}