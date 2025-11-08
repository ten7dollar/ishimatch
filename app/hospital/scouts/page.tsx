"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useScoutsOutbox, type ScoutOutRecord } from "../_providers/scout-outbox";

// 初回ダミーシード（必要なければ削除）
function seedOnce(add: (rows: ScoutOutRecord[]) => void) {
  if (typeof window === "undefined") return;
  const FLAG = "ishimatch:seed:hospital:scouts";
  if (localStorage.getItem(FLAG)) return;

  const iso = (y:number,m:number,d:number,h:number,mi:number)=> new Date(y,m-1,d,h,mi).toISOString();
  add([
    { id:"s-001", studentId:"st-001", studentName:"山田太郎", university:"東京大学医学部", gradYear:"2026", sentAt: iso(2025,11,1,10,0), appliedAt: iso(2025,11,2,12,0), readAt: iso(2025,11,1,12,0) },
    { id:"s-002", studentId:"st-002", studentName:"佐藤花子", university:"京都大学医学部", gradYear:"2026", sentAt: iso(2025,11,3,14,20), readAt: iso(2025,11,3,16,0) },
    { id:"s-003", studentId:"st-003", studentName:"鈴木一郎", university:"大阪大学医学部", gradYear:"2026", sentAt: iso(2025,11,5,11,0) }, // 未読
    { id:"s-004", studentId:"st-004", studentName:"田中美咲", university:"慶應義塾大学医学部", gradYear:"2025", sentAt: iso(2025,11,6,9,30), readAt: iso(2025,11,6,10,0) },
    { id:"s-005", studentId:"st-005", studentName:"伊藤健太", university:"東北大学医学部", gradYear:"2025", sentAt: iso(2025,11,7,13,45), readAt: iso(2025,11,7,15,0) },
  ]);
  localStorage.setItem(FLAG, "1");
}

export default function HospitalScoutStatusPage() {
  const { records, sentCount, readCount, appliedCount, unreadCount, appliedRate, markRead, markUnread, markApplied, addMocks } = useScoutsOutbox();

  useEffect(()=>{ seedOnce(addMocks); }, [addMocks]);

  // 検索・フィルタ
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"unread"|"read"|"applied">("all");

  const filtered = useMemo(() => {
    let arr = records;
    if (q.trim()) {
      const low = q.trim().toLowerCase();
      arr = arr.filter(r =>
        r.studentName.toLowerCase().includes(low) ||
        r.university.toLowerCase().includes(low)
      );
    }
    if (filter === "unread") arr = arr.filter(r => !r.readAt);
    if (filter === "read")   arr = arr.filter(r => !!r.readAt);
    if (filter === "applied") arr = arr.filter(r => !!r.appliedAt);
    return [...arr].sort((a,b)=> b.sentAt.localeCompare(a.sentAt));
  }, [records, q, filter]);

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
          <span className="ml-2 text-blue-700">（非常に良好です！）</span>
        </p>
      </section>

      {/* 検索・フィルタ */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="学生名、大学名で検索…"
            className="border rounded px-3 py-2 w-full md:w-80"
          />
          <div className="flex gap-2">
            <FilterButton label="すべて" active={filter==="all"} onClick={()=>setFilter("all")} />
            <FilterButton label="未読" active={filter==="unread"} onClick={()=>setFilter("unread")} />
            <FilterButton label="既読" active={filter==="read"} onClick={()=>setFilter("read")} />
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
                  <td className="py-2 px-2">{r.studentName}</td>
                  <td className="py-2 px-2">{r.university}</td>
                  <td className="py-2 px-2">{r.gradYear}</td>
                  <td className="py-2 px-2">{new Date(r.sentAt).toLocaleString()}</td>
                  <td className="py-2 px-2">
                    <StatusPill record={r} />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-2">
                      {r.readAt
                        ? <button onClick={()=>markUnread(r.id)} className="px-2 py-1 text-xs rounded border">未読に戻す</button>
                        : <button onClick={()=>markRead(r.id)} className="px-2 py-1 text-xs rounded border">既読にする</button>
                      }
                      {!r.appliedAt && (
                        <button onClick={()=>markApplied(r.id)} className="px-2 py-1 text-xs rounded bg-green-600 text-white">応募済みにする</button>
                      )}
                      <Link href={`/hospital/students/${encodeURIComponent(r.studentId)}`} className="px-2 py-1 text-xs rounded border">
                        詳細
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">該当するスカウトがありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

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
function StatusPill({ record }: { record: ScoutOutRecord }) {
  if (record.appliedAt) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">応募済み</span>;
  }
  if (record.readAt) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">既読</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">未読</span>;
}