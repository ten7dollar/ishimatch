"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/* ================================
   型（status は英字コード）
================================= */
type StatusCode =
  | "new" // 新規
  | "interviewed" // 面談済み
  | "visit" // 見学予定
  | "screening" // 選考中
  | "offer" // 内定
  | "declined"; // 辞退

const STATUS_LABEL: Record<StatusCode, string> = {
  new: "新規",
  interviewed: "面談済み",
  visit: "見学予定",
  screening: "選考中",
  offer: "内定",
  declined: "辞退",
};

const STATUS_OPTIONS: Array<{ value: StatusCode; label: string }> = (
  ["new", "interviewed", "visit", "screening", "offer", "declined"] as StatusCode[]
).map((k) => ({ value: k, label: STATUS_LABEL[k] }));

type ApplicationRow = {
  id: string;
  hospital_id: string;
  student_id: string;
  status: StatusCode;
  created_at: string;
  message: string | null;
};

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  university: string | null;
  grad_year: number | null;
};

type ApplicationView = {
  id: string;
  studentId: string;
  studentName: string;
  university: string;
  gradYear: number;
  appliedAt: string;
  status: StatusCode;
  email?: string;
  message?: string | null;
};

/* ================================
   ページ
================================= */
export default function HospitalApplicationsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<ApplicationView[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusCode | "all">("all");
  const [gradFilter, setGradFilter] =
    useState<"all" | 2025 | 2026 | 2027 | 2028>("all");

  // メッセージ表示用
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: uerr,
      } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      if (!user) {
        setApps([]);
        return;
      }
      const hospitalId = user.id;

      const { data: appRows, error: aerr } = await supabase
        .from("hospital_applications")
        .select("id,hospital_id,student_id,status,created_at,message")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (aerr) throw aerr;
      if (!appRows || appRows.length === 0) {
        setApps([]);
        return;
      }

      const studentIds = Array.from(new Set(appRows.map((r) => r.student_id)));
      const studentMap = new Map<string, StudentRow>();
      if (studentIds.length > 0) {
        const { data: stRows, error: serr } = await supabase
          .from("students")
          .select("id,name,email,university,grad_year")
          .in("id", studentIds);
        if (serr) throw serr;
        (stRows ?? []).forEach((s) => studentMap.set(s.id, s as StudentRow));
      }

      const merged: ApplicationView[] = (appRows as ApplicationRow[]).map((a) => {
        const st = studentMap.get(a.student_id);
        return {
          id: a.id,
          studentId: a.student_id,
          studentName: (st?.name || "（氏名未登録）").toString(),
          university: (st?.university || "—").toString(),
          gradYear: st?.grad_year || 0,
          appliedAt: a.created_at,
          status: a.status,
          email: st?.email || undefined,
          message: a.message ?? null,
        };
      });
      setApps(merged);
    } catch (e: any) {
      console.error("[hospital-applications] load error:", e?.message || e);
      alert(`応募の取得に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, next: StatusCode) => {
    const before = apps;
    setApps((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");

      const { error } = await supabase
        .from("hospital_applications")
        .update({ status: next })
        .eq("id", id)
        .eq("hospital_id", user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error("[hospital-applications] update error:", e?.message || e);
      alert(`ステータス更新に失敗しました：${e?.message ?? "unknown"}`);
      setApps(before);
    }
  };

  useEffect(() => {
    load();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      ch = supabase
        .channel(`hosp-apps:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "hospital_applications",
            filter: `hospital_id=eq.${user.id}`,
          },
          () => load()
        )
        .subscribe();
    })();
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { total, byStatus } = useMemo(() => {
    const t = apps.length;
    const map: Record<StatusCode, number> = {
      new: 0,
      interviewed: 0,
      visit: 0,
      screening: 0,
      offer: 0,
      declined: 0,
    };
    apps.forEach((r) => {
      map[r.status] = (map[r.status] || 0) + 1;
    });
    return { total: t, byStatus: map };
  }, [apps]);

  const list = useMemo(() => {
    let arr = apps;
    if (statusFilter !== "all") arr = arr.filter((r) => r.status === statusFilter);
    if (gradFilter !== "all") arr = arr.filter((r) => r.gradYear === gradFilter);
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
  }, [apps, q, statusFilter, gradFilter]);

  const selected = list.find((a) => a.id === selectedMessageId);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">応募管理</h1>
      <p className="text-gray-600">学生からの応募を確認し、選考を進めることができます</p>

      {/* KPI */}
      <section className="grid md:grid-cols-5 gap-3">
        <KpiCard title="総応募数" value={total} />
        <KpiCard title="新規" value={byStatus["new"]} />
        <KpiCard title="面談済み" value={byStatus["interviewed"]} />
        <KpiCard title="見学予定" value={byStatus["visit"]} />
        <KpiCard title="選考中" value={byStatus["screening"]} />
        <KpiCard title="内定" value={byStatus["offer"]} />
      </section>

      {/* フィルタ */}
      <section className="rounded-xl border bg-white p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-gray-600 mb-1">ステータス</div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusCode | "all")}
              className="border rounded px-3 py-2 text-sm w-full"
            >
              <option value="all">すべて</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
                  e.target.value === "all" ? "all" : (Number(e.target.value) as any)
                )
              }
              className="border rounded px-3 py-2 text-sm w-full"
            >
              <option value="all">すべて</option>
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
          <p className="text-sm text-gray-600">
            学生名をクリックするとプロフィールへ移動します。メッセージは「メッセージを見る」から確認できます。
          </p>
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
                <th className="py-2 px-4">メッセージ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-primary-50/40">
                  <td className="py-2 px-4 text-primary-700 font-semibold">
                    <Link
                      href={`/hospital/students/${encodeURIComponent(r.studentId)}`}
                      className="hover:underline"
                    >
                      {r.studentName}
                    </Link>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="py-2 px-4">
                    {r.university}・{r.gradYear ? `${r.gradYear}年卒` : "—"}
                  </td>
                  <td className="py-2 px-4">
                    {new Date(r.appliedAt).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="py-2 px-4">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="py-2 px-4">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as StatusCode)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    {r.message ? (
                      <button
                        onClick={() =>
                          setSelectedMessageId((prev) => (prev === r.id ? null : r.id))
                        }
                        className="text-xs text-primary-600 underline hover:text-primary-800"
                      >
                        メッセージを見る
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">（なし）</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    該当する応募がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 選択中メッセージ表示 */}
        {selected && (
          <div className="border-t px-5 py-4 bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {selected.studentName} さんからのメッセージ
                </p>
                <p className="text-xs text-slate-500">
                  応募日：{new Date(selected.appliedAt).toLocaleString("ja-JP")}
                </p>
              </div>
              <button
                onClick={() => setSelectedMessageId(null)}
                className="text-xs text-slate-500 hover:underline"
              >
                閉じる
              </button>
            </div>
            <div className="mt-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed">
              {selected.message || "（メッセージは未入力です）"}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ================================
   小さな部品
================================= */
function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-bold text-primary-700">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: StatusCode }) {
  const CLASS: Record<StatusCode, string> = {
    new: "bg-blue-100 text-blue-700",
    interviewed: "bg-purple-100 text-purple-700",
    visit: "bg-indigo-100 text-indigo-700",
    screening: "bg-amber-100 text-amber-700",
    offer: "bg-green-100 text-green-700",
    declined: "bg-gray-200 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}