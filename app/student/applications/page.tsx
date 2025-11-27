"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** 画面表示用 型 */
type ApplicationStatus = "選考中" | "面談" | "内定" | "否決" | "取消";
type Source = "scout" | "self";

type Application = {
  id: string;
  hospitalId: string;      // ← /student/hospitals/[id] に飛ぶための公開ID (hospitals.id)
  hospitalName: string;
  appliedAt: string;       // ISO
  status: ApplicationStatus;
  source: Source;
  note?: string;
  tags?: string[];
};

const TABS: Array<"すべて" | ApplicationStatus> = [
  "すべて",
  "選考中",
  "面談",
  "内定",
  "否決",
  "取消",
];

type HospitalAccountLite = {
  id: string;              // hospital_accounts.id ＝ applications.hospital_id
  hospital_id: string | null;   // 公開ID (hospitals.id)
  hospital_name: string | null; // 表示名
};

export default function ApplicationsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [tab, setTab] = useState<(typeof TABS)[number]>("すべて");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  /** DBから応募履歴を取得（applications → hospital_accounts） */
  const refresh = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 1) 自分の応募（hospital_applications）
      const { data: apps, error: aerr } = await supabase
        .from("hospital_applications")
        .select("id,hospital_id,status,source,note,tags,created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (aerr) throw aerr;

      if (!apps || apps.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) 病院アカウント情報を hospital_accounts から取得
      const hospitalAccountIds = Array.from(new Set(apps.map((a: any) => a.hospital_id)));
      const { data: accRows, error: accErr } = await supabase
        .from("hospital_accounts")
        .select("id,hospital_id,hospital_name")
        .in("id", hospitalAccountIds);

      if (accErr) throw accErr;

      const accMap = new Map<string, HospitalAccountLite>();
      (accRows ?? []).forEach((ha: any) => {
        accMap.set(String(ha.id), {
          id: String(ha.id),
          hospital_id: ha.hospital_id ? String(ha.hospital_id) : null,
          hospital_name: ha.hospital_name ?? null,
        });
      });

      const mapped: Application[] = (apps as any[]).map((a) => {
        const acc = accMap.get(String(a.hospital_id));
        const publicHospitalId = acc?.hospital_id ?? String(a.hospital_id); // /student/hospitals/[id] 用
        const hospitalName = acc?.hospital_name ?? "(名称未設定)";

        // ステータスは今は simple に "new" 等をそのまま日本語ラベルにせず保持しているので、
        // 必要ならここでマッピングしてもよい（暫定そのまま）
        const status: ApplicationStatus =
          (a.status as ApplicationStatus) || ("選考中" as ApplicationStatus);

        return {
          id: String(a.id),
          hospitalId: publicHospitalId,
          hospitalName,
          appliedAt: new Date(a.created_at ?? Date.now()).toISOString(),
          status,
          source: (a.source || "self") as Source,
          note: a.note ?? "",
          tags: Array.isArray(a.tags) ? a.tags : [],
        };
      });

      setRows(mapped);
    } catch (e: any) {
      console.error("[student-applications] refresh error:", e?.message || e);
      alert(`応募履歴の取得に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Realtime: 自分の応募だけ購読 → 変更時に再取得 */
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      ch = supabase
        .channel(`student-apps:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "hospital_applications",
            filter: `student_id=eq.${user.id}`,
          },
          () => refresh()
        )
        .subscribe();
    })();

    return () => {
      if (ch) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** タブ・検索フィルタ */
  const list = useMemo(() => {
    let arr = [...rows];

    if (q.trim()) {
      const low = q.trim().toLowerCase();
      arr = arr.filter((a) => a.hospitalName.toLowerCase().includes(low));
    }
    if (tab !== "すべて") {
      arr = arr.filter((a) => a.status === tab);
    }
    return arr;
  }, [rows, q, tab]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">応募履歴</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="病院名で検索"
            className="border rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            title="最新の状態に更新"
          >
            再読込み
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-t text-sm ${
                active ? "bg-primary-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* リスト */}
      {loading ? (
        <div className="p-8 border rounded bg-gray-50 text-center text-gray-500">
          取得中…
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 border rounded bg-gray-50 text-center text-gray-500">
          まだ応募履歴がありません。
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((app) => (
            <div key={app.id} className="rounded-xl border bg-white p-4">
              {/* 見出し：病院名 + バッジ */}
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{app.hospitalName}</h3>
                <SourceBadge source={app.source} />
              </div>

              {/* メタ情報 */}
              <div className="mt-2 grid md:grid-cols-4 gap-2 text-sm text-gray-700">
                <div>
                  <span className="text-gray-500">応募日：</span>
                  {new Date(app.appliedAt).toLocaleDateString("ja-JP")}
                </div>
                <div>
                  <span className="text-gray-500">ステータス：</span>
                  {app.status}
                </div>
                <div className="col-span-2">
                  {app.tags?.map((t) => (
                    <span
                      key={t}
                      className="inline-block mr-2 px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* アクション */}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/student/hospitals/${encodeURIComponent(app.hospitalId)}`}
                  className="px-3 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-sm"
                >
                  病院詳細
                </Link>
                <Link
                  href="/student/scouts"
                  className="px-3 py-1 rounded border text-sm"
                >
                  スカウト一覧
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

/* ===== 補助：ソースバッジ ===== */
function SourceBadge({ source }: { source: Source }) {
  if (source === "scout") {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
        スカウト経由
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
      自主応募
    </span>
  );
}