// app/hospital/applications/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/* ================================
   型
================================= */
type AppStatus = "新規" | "面談済み" | "見学予定" | "選考中" | "内定" | "辞退";

type ApplicationRow = {
  id: string;
  hospital_id: string;
  student_id: string;
  status: AppStatus;
  created_at: string; // ISO
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
  status: AppStatus;
  email?: string;
};

/* ================================
   定数
================================= */
const ALL_STATUS: AppStatus[] = [
  "新規",
  "面談済み",
  "見学予定",
  "選考中",
  "内定",
  "辞退",
];

/* ================================
   ページ
================================= */
export default function HospitalApplicationsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<ApplicationView[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"すべて" | AppStatus>("すべて");
  const [gradFilter, setGradFilter] =
    useState<"すべて" | 2025 | 2026 | 2027 | 2028>("すべて");

  /** DB からこの病院の応募を読み込む（2段階で students をマージ） */
  const load = async () => {
    setLoading(true);
    try {
      // 1) 病院ユーザーの id ＝ hospital_id
      const {
        data: { user },
        error: uerr,
      } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      if (!user) {
        setApps([]);
        setLoading(false);
        return;
      }
      const hospitalId = user.id;

      // 2) hospital_applications を取得（RLS: auth.uid() = hospital_id）
      const { data: appRows, error: aerr } = await supabase
        .from("hospital_applications")
        .select("id,hospital_id,student_id,status,created_at")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });
      if (aerr) throw aerr;

      if (!appRows || appRows.length === 0) {
        setApps([]);
        setLoading(false);
        return;
      }

      // 3) 関連する学生プロフィールを一括取得
      const studentIds = Array.from(
        new Set(appRows.map((r) => r.student_id).filter(Boolean))
      );
      let studentMap = new Map<string, StudentRow>();
      if (studentIds.length > 0) {
        const { data: stRows, error: serr } = await supabase
          .from("students")
          .select("id,name,email,university,grad_year")
          .in("id", studentIds);
        if (serr) throw serr;
        (stRows ?? []).forEach((s) => studentMap.set(s.id, s as StudentRow));
      }

      // 4) 表示用へマージ
      const merged: ApplicationView[] = (appRows as ApplicationRow[]).map(
        (a) => {
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
          };
        }
      );
      setApps(merged);
    } catch (e: any) {
      console.error("[hospital-applications] load error:", e?.message || e);
      alert(`応募取得に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  /** ステータス更新（DB 反映 → 成功時に state 更新） */
  const updateStatus = async (id: string, next: AppStatus) => {
    try {
      const { error } = await supabase
        .from("hospital_applications")
        .update({ status: next })
        .eq("id", id);
      if (error) throw error;

      // OK：画面反映
      setApps((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    } catch (e: any) {
      console.error("[hospital-applications] update error:", e?.message || e);
      alert(`ステータス更新に失敗しました：${e?.message ?? "unknown"}`);
    }
  };

  useEffect(() => {
    load();
    // Realtime（自院の応募だけ監視して、他画面からの更新も即反映）
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    return () => { if (ch) supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** KPI 集計 */
  const { total, byStatus } = useMemo(() => {
    const t = apps.length;
    const map: Record<AppStatus, number> = {
      新規: 0,
      面談済み: 0,
      見学予定: 0,
      選考中: 0,
      内定: 0,
      辞退: 0,
    };
    apps.forEach((r) => (map[r.status] = (map[r.status] || 0) + 1));
    return { total: t, byStatus: map };
  }, [apps]);

  /** フィルタ / 検索 */
  const list = useMemo(() => {
    let arr = apps;
    if (statusFilter !== "すべて")
      arr = arr.filter((r) => r.status === statusFilter);
    if (gradFilter !== "すべて")
      arr = arr.filter((r) => r.gradYear === gradFilter);
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

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">応募管理</h1>
      <p className="text-gray-600">学生からの応募を確認し、選考を進めることができます</p>

      {/* KPI */}
      <section className="grid md:grid-cols-5 gap-3">
        <KpiCard title="総応募数" value={total} />
        <KpiCard title="新規" value={byStatus["新規"]} />
        <KpiCard title="面談済み" value={byStatus["面談済み"]} />
        <KpiCard title="見学予定" value={byStatus["見学予定"]} />
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

      {/* 一覧（操作列なし） */}
      <section className="rounded-xl border bg-white p-0">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">応募一覧</h2>
          <p className="text-sm text-gray-600">
            学生名をクリックするとプロフィールへ移動します
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
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-primary-50">
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
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
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
    <span className={`px-2 py-0.5 rounded-full text-xs ${map[status]}`}>
      {status}
    </span>
  );
}