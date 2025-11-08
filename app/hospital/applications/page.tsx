"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AppStatus = "新規" | "面談済み" | "見学予定" | "選考中" | "内定" | "辞退";
type Application = {
  id: string;
  studentId: string;
  studentName: string;
  university: string;
  gradYear: number;
  appliedAt: string; // ISO or yyyy-MM-dd
  status: AppStatus;
  email?: string;
};

const STORAGE_KEY = "ishimatch:hospital:applications";
const ALL_STATUS: AppStatus[] = ["新規", "面談済み", "見学予定", "選考中", "内定", "辞退"];

/** 初回ダミー投入（本番は API / Supabase に置換） */
function seedOnce() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  const iso = (y: number, m: number, d: number) =>
    new Date(y, m - 1, d, 10, 0).toISOString();
  const mock: Application[] = [
    {
      id: "a-001",
      studentId: "st-001",
      studentName: "山田太郎",
      university: "東京大学医学部",
      gradYear: 2026,
      appliedAt: iso(2025, 11, 7),
      status: "新規",
      email: "yamada@example.com",
    },
    {
      id: "a-002",
      studentId: "st-002",
      studentName: "佐藤花子",
      university: "京都大学医学部",
      gradYear: 2026,
      appliedAt: iso(2025, 11, 5),
      status: "面談済み",
      email: "sato@example.com",
    },
    {
      id: "a-003",
      studentId: "st-003",
      studentName: "田中美咲",
      university: "慶應義塾大学医学部",
      gradYear: 2026,
      appliedAt: iso(2025, 11, 6),
      status: "選考中",
      email: "tanaka@example.com",
    },
    {
      id: "a-004",
      studentId: "st-004",
      studentName: "高橋健太",
      university: "名古屋大学医学部",
      gradYear: 2025,
      appliedAt: iso(2025, 11, 4),
      status: "内定",
      email: "takahashi@example.com",
    },
    {
      id: "a-005",
      studentId: "st-005",
      studentName: "鈴木一郎",
      university: "大阪大学医学部",
      gradYear: 2025,
      appliedAt: iso(2025, 10, 30),
      status: "辞退",
      email: "suzuki@example.com",
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
}

export default function HospitalApplicationsPage() {
  seedOnce();

  const [rows, setRows] = useState<Application[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"すべて" | AppStatus>("すべて");
  const [gradFilter, setGradFilter] =
    useState<"すべて" | 2025 | 2026 | 2027 | 2028>("すべて");

  // 初期ロード
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setRows(JSON.parse(raw));
  }, []);

  // 保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  // 集計
  const { total, byStatus } = useMemo(() => {
    const t = rows.length;
    const map: Record<AppStatus, number> = {
      新規: 0,
      面談済み: 0,
      見学予定: 0,
      選考中: 0,
      内定: 0,
      辞退: 0,
    };
    rows.forEach((r) => map[r.status]++);
    return { total: t, byStatus: map };
  }, [rows]);

  // 絞り込み
  const list = useMemo(() => {
    let arr = rows;
    if (statusFilter !== "すべて") arr = arr.filter((r) => r.status === statusFilter);
    if (gradFilter !== "すべて") arr = arr.filter((r) => r.gradYear === gradFilter);
    if (q.trim()) {
      const low = q.trim().toLowerCase();
      arr = arr.filter(
        (r) =>
          r.studentName.toLowerCase().includes(low) ||
          r.university.toLowerCase().includes(low) ||
          (r.email || "").toLowerCase().includes(low)
      );
    }
    return [...arr].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  }, [rows, q, statusFilter, gradFilter]);

  const updateStatus = (id: string, next: AppStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">応募管理</h1>
      <p className="text-gray-600">学生からの応募を確認し、選考を進めることができます</p>

      {/* KPI */}
      <section className="grid md:grid-cols-5 gap-3">
        <KpiCard title="総応募数" value={total} />
        <KpiCard title="新規" value={byStatus["新規"]} />
        <KpiCard title="面談済み" value={byStatus["面談済み"]} />
        <KpiCard title="選考中" value={byStatus["選考中"]} />
        <KpiCard title="内定" value={byStatus["内定"]} />
      </section>

      {/* フィルタ */}
      <section className="rounded-xl border bg-white p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-gray-600 mb-1">ステータス</div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border rounded px-3 py-2 text-sm w-full"
            >
              <option value="すべて">すべて</option>
              {ALL_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">卒業年</div>
            <select
              value={gradFilter}
              onChange={(e) =>
                setGradFilter(
                  e.target.value === "すべて" ? "すべて" : (Number(e.target.value) as any)
                )
              }
              className="border rounded px-3 py-2 text-sm w-full"
            >
              <option value="すべて">すべて</option>
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">キーワード</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名前・大学・メールで検索"
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
        </div>
      </section>

      {/* 一覧 */}
      <section className="rounded-xl border bg-white p-0">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">応募一覧</h2>
          <p className="text-sm text-gray-600">クリックして詳細を確認できます</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-4">学生名</th>
                <th className="py-2 px-4">大学・卒年</th>
                <th className="py-2 px-4">応募日</th>
                <th className="py-2 px-4">ステータス</th>
                <th className="py-2 px-4">ステータス変更</th>
                <th className="py-2 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-primary-50">
                  <td className="py-2 px-4 text-primary-700 font-semibold">
                    <Link href={`/hospital/students/${encodeURIComponent(r.studentId)}`}>
                      {r.studentName}
                    </Link>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="py-2 px-4">
                    {r.university}・{r.gradYear}年卒
                  </td>
                  <td className="py-2 px-4">
                    {new Date(r.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="py-2 px-4">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as AppStatus)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {ALL_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Link
                      href={`/hospital/students/${encodeURIComponent(r.studentId)}`}
                      className="text-primary-600 hover:underline"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    該当する応募がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-bold text-primary-700">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, string> = {
    新規: "bg-blue-100 text-blue-700",
    面談済み: "bg-purple-100 text-purple-700",
    見学予定: "bg-indigo-100 text-indigo-700",
    選考中: "bg-amber-100 text-amber-700",
    内定: "bg-green-100 text-green-700",
    辞退: "bg-gray-200 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${map[status]}`}>{status}</span>
  );
}