// app/hospital/scouts/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/* ================================
   型
================================= */
type OutRow = {
  id: string;
  student_id: string;
  message: string | null;
  created_at: string;
  read_at: string | null;
  applied_at: string | null;
};

type StudentRow = {
  id: string;
  name: string | null;
  university: string | null;
  grad_year: number | null;
};

type RecordView = {
  id: string;
  studentId: string;
  studentName: string;
  university: string;
  gradYear: number | null;
  sentAt: string;      // created_at
  readAt: string | null;
  appliedAt: string | null;
  title: string;       // 1行目要約
  body: string;        // 全文
};

type FilterKey = "all" | "unread" | "read" | "applied";

export const dynamic = "force-dynamic";

/* ================================
   ページ本体
================================= */
export default function HospitalScoutStatusPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [rows, setRows] = useState<RecordView[]>([]);
  const [loading, setLoading] = useState(true);

  // 検索・フィルタ
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  /** 一覧取得（2段階：scout_invitations → students） */
  const refresh = async () => {
    setLoading(true);
    try {
      // 病院=ログインユーザー
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 1) 自院から送ったスカウト一覧
      const { data: outbox, error: oerr } = await supabase
        .from("scout_invitations")
        .select("id,student_id,message,created_at,read_at,applied_at")
        .eq("hospital_id", user.id)
        .order("created_at", { ascending: false });
      if (oerr) throw oerr;

      const list = (outbox ?? []) as OutRow[];
      if (list.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) 表示用に学生プロファイルをマージ
      const studentIds = Array.from(new Set(list.map(r => r.student_id)));
      const studentMap = new Map<string, StudentRow>();
      if (studentIds.length > 0) {
        const { data: stRows, error: serr } = await supabase
          .from("students")
          .select("id,name,university,grad_year")
          .in("id", studentIds);
        if (serr) throw serr;
        (stRows ?? []).forEach((s: any) => studentMap.set(String(s.id), s as StudentRow));
      }

      const toTitle = (m: string) => {
        const first = (m || "").split(/\r?\n/)[0]?.trim() ?? "";
        if (!first) return "スカウトメッセージ";
        return first.length > 40 ? first.slice(0, 40) + "…" : first;
      };

      const merged: RecordView[] = list.map((r) => {
        const st = studentMap.get(r.student_id);
        return {
          id: r.id,
          studentId: r.student_id,
          studentName: st?.name ?? "（氏名未登録）",
          university: st?.university ?? "—",
          gradYear: st?.grad_year ?? null,
          sentAt: r.created_at,
          readAt: r.read_at,
          appliedAt: r.applied_at,
          title: toTitle(r.message ?? ""),
          body: r.message ?? "",
        };
      });

      setRows(merged);
    } catch (e: any) {
      console.error("[hospital-scouts] refresh error:", e?.message || e);
      alert(`スカウト一覧の取得に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  /** ステータス操作（既読/未読/応募済みにする） */
  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    const before = rows;
    setRows(prev => prev.map(r => r.id === id ? { ...r, readAt: now } : r));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authed");
      const { error } = await supabase
        .from("scout_invitations")
        .update({ read_at: now })
        .eq("id", id)
        .eq("hospital_id", user.id);
      if (error) throw error;
    } catch (e) {
      console.error("[hospital-scouts] markRead error:", (e as any)?.message);
      setRows(before); // ロールバック
    }
  };

  const markUnread = async (id: string) => {
    const before = rows;
    setRows(prev => prev.map(r => r.id === id ? { ...r, readAt: null } : r));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authed");
      const { error } = await supabase
        .from("scout_invitations")
        .update({ read_at: null })
        .eq("id", id)
        .eq("hospital_id", user.id);
      if (error) throw error;
    } catch (e) {
      console.error("[hospital-scouts] markUnread error:", (e as any)?.message);
      setRows(before);
    }
  };

  const markApplied = async (id: string) => {
    const now = new Date().toISOString();
    const before = rows;
    setRows(prev => prev.map(r => r.id === id ? { ...r, appliedAt: now } : r));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authed");
      const { error } = await supabase
        .from("scout_invitations")
        .update({ applied_at: now })
        .eq("id", id)
        .eq("hospital_id", user.id);
      if (error) throw error;
    } catch (e) {
      console.error("[hospital-scouts] markApplied error:", (e as any)?.message);
      setRows(before);
    }
  };

  /** 初回 + Realtime購読（自院のスカウトだけ） */
  useEffect(() => {
    refresh();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      ch = supabase
        .channel(`hospital-scouts:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "scout_invitations", filter: `hospital_id=eq.${user.id}` },
          () => refresh()
        )
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 集計・フィルタ・検索 */
  const sentCount    = rows.length;
  const readCount    = rows.filter(r => !!r.readAt).length;
  const appliedCount = rows.filter(r => !!r.appliedAt).length;
  const unreadCount  = sentCount - readCount;
  const appliedRate  = sentCount === 0 ? 0 : appliedCount / sentCount;

  const filtered = useMemo(() => {
    let arr = rows;
    if (q.trim()) {
      const low = q.trim().toLowerCase();
      arr = arr.filter(r =>
        (r.studentName || "").toLowerCase().includes(low) ||
        (r.university  || "").toLowerCase().includes(low) ||
        (String(r.gradYear || "")).includes(low)
      );
    }
    if (filter === "unread")  arr = arr.filter(r => !r.readAt);
    if (filter === "read")    arr = arr.filter(r =>  r.readAt);
    if (filter === "applied") arr = arr.filter(r =>  r.appliedAt);
    return [...arr].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [rows, q, filter]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">スカウトステータス</h1>
      <p className="text-gray-600">送信したスカウトの状況を確認できます</p>

      {/* 統計カード */}
      <section className="grid md:grid-cols-4 gap-4">
        <StatCard title="送付数" value={sentCount} />
        <StatCard title="既読数" value={readCount} chip={`${Math.round((readCount/(sentCount||1))*100)}%`} />
        <StatCard title="応募数" value={appliedCount} chip={`${Math.round((appliedCount/(sentCount||1))*100)}%`} />
        <StatCard title="未読数" value={unreadCount} />
      </section>

      {/* 応募率 */}
      <section className="rounded-xl border bg-blue-50/40 px-4 py-3 flex items-center gap-3">
        <span className="px-3 py-2 rounded-full bg-blue-100 text-blue-700 text-sm">i</span>
        <p className="text-sm text-blue-800">
          スカウト経由の応募率： <b>{Math.round(appliedRate*100)}%</b>（{appliedCount} / {sentCount}）
        </p>
      </section>

      {/* 検索・フィルタ */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="学生名、大学名、卒年で検索…"
            className="border rounded px-3 py-2 w-full md:w-80"
          />
          <div className="flex gap-2">
            <FilterButton label="すべて"   active={filter==="all"}     onClick={()=>setFilter("all")} />
            <FilterButton label="未読"     active={filter==="unread"}  onClick={()=>setFilter("unread")} />
            <FilterButton label="既読"     active={filter==="read"}    onClick={()=>setFilter("read")} />
            <FilterButton label="応募済み" active={filter==="applied"} onClick={()=>setFilter("applied")} />
          </div>
        </div>

        {/* テーブル */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-2">学生名</th>
                <th className="py-2 px-2">大学</th>
                <th className="py-2 px-2">卒業予定</th>
                <th className="py-2 px-2">送信日時</th>
                <th className="py-2 px-2">ステータス</th>
                <th className="py-2 px-2 text-right">アクション</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 px-2">
                    <Link href={`/hospital/students/${encodeURIComponent(r.studentId)}`} className="text-primary-700 font-semibold hover:underline">
                      {r.studentName}
                    </Link>
                  </td>
                  <td className="py-2 px-2">{r.university}</td>
                  <td className="py-2 px-2">{r.gradYear ?? "—"}</td>
                  <td className="py-2 px-2">{new Date(r.sentAt).toLocaleString()}</td>
                  <td className="py-2 px-2"><StatusPill read={!!r.readAt} applied={!!r.appliedAt} /></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-2">
                      {r.readAt
                        ? <button onClick={()=>markUnread(r.id)} className="px-2 py-1 text-xs rounded border">未読に戻す</button>
                        : <button onClick={()=>markRead(r.id)}   className="px-2 py-1 text-xs rounded border">既読にする</button>}
                      {!r.appliedAt && (
                        <button onClick={()=>markApplied(r.id)} className="px-2 py-1 text-xs rounded bg-green-600 text-white">
                          応募済みにする
                        </button>
                      )}
                      <Link href={`/hospital/students/${encodeURIComponent(r.studentId)}`} className="px-2 py-1 text-xs rounded border">
                        詳細
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">該当するスカウトがありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* ================================
   小さな部品
================================= */
function StatCard({ title, value, chip }: { title:string; value:number; chip?:string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="flex items-center gap-2 mt-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {chip && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{chip}</span>}
      </div>
    </div>
  );
}
function FilterButton({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded ${active ? "bg-primary-600 text-white" : "border text-gray-700"}`}
    >
      {label}
    </button>
  );
}
function StatusPill({ read, applied }: { read:boolean; applied:boolean }) {
  if (applied) return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">応募済み</span>;
  if (read)    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100  text-blue-700">既読</span>;
  return             <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100  text-gray-600">未読</span>;
}