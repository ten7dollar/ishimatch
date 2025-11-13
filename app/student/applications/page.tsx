"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** タブ（既存UIの想定に合わせる） */
type ApplicationStatus = "選考中" | "面談" | "内定" | "否決" | "取消";
type Source = "scout" | "self";

/** 画面に表示する最終形 */
type Application = {
  id: string;
  hospitalId: string;
  hospitalName: string;
  appliedAt: string;            // ISO
  status: ApplicationStatus;
  source: Source;
  note?: string;
  tags?: string[];
};

const TABS: Array<"すべて" | ApplicationStatus> = [
  "すべて", "選考中", "面談", "内定", "否決", "取消",
];

/** ★ ここはあなたの環境の FK 名に合わせてください */
const HOSPITAL_FK = "hospital_applications_hospital_id_fkey";

export default function ApplicationsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // UI 状態
  const [tab, setTab] = useState<(typeof TABS)[number]>("すべて");
  const [q, setQ] = useState("");

  // 取得データ
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  /** DBから応募履歴を取得（ログアウト後も DB に残る） */
  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      // hospitals を JOIN（外部キー名に注意）
      const { data, error } = await supabase
        .from("hospital_applications")
        .select(
          `
           id,
           hospital_id,
           status,
           source,
           note,
           tags,
           created_at,
           hospitals:${HOSPITAL_FK} ( id, name )
          `
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized: Application[] = (data ?? []).map((r: any) => ({
        id          : String(r.id),
        hospitalId  : String(r.hospital_id),
        hospitalName: r.hospitals?.name ?? "(名称未設定)",
        appliedAt   : new Date(r.created_at ?? Date.now()).toISOString(),
        status      : (r.status || "選考中") as ApplicationStatus,
        source      : (r.source || "self") as Source,
        note        : r.note ?? "",
        tags        : Array.isArray(r.tags) ? r.tags : [],
      }));

      setRows(normalized);
    } catch (e: any) {
      console.error("[applications] load error", e?.message);
      alert(`応募履歴の取得に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // 初回のみ

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
            onClick={load}
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
                  {new Date(app.appliedAt).toLocaleDateString()}
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
                {/* 将来：メッセージスレッド等に遷移 */}
                <Link href="/student/scouts" className="px-3 py-1 rounded border text-sm">
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