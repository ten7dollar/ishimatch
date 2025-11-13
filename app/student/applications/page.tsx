"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** 学生側 応募履歴 localStorage キー（既存のMVPデータ） */
const STUDENT_APPS_KEY = "ishimatch:student:applications";

/* ===== 型定義（UI用） ===== */
type ApplicationStatus = "選考中" | "面談" | "内定" | "否決" | "取消";
type Source = "scout" | "self"; // スカウト経由 or 自主応募

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

/** タブ（既存UIが「すべて / 選考中 / 面談 / 内定 / 否決 / 取消」の想定） */
const TABS: Array<"すべて" | ApplicationStatus> = [
  "すべて", "選考中", "面談", "内定", "否決", "取消",
];

/* ===== 「スカウト経由」バッジ ===== */
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

/* ===================================================================
   ページ
=================================================================== */
export default function ApplicationsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // 既存UI：タブとキーワード検索
  const [tab, setTab] = useState<(typeof TABS)[number]>("すべて");
  const [q, setQ] = useState("");

  // Supabase + localStorage をマージした「真実の配列」
  const [serverApps, setServerApps] = useState<Application[]>([]);
  const [localApps, setLocalApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  /** Supabase 側（永続）を取得 */
  const loadFromServer = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setServerApps([]);
        setLoading(false);
        return;
      }

      // hospitals.name を取得（FK が無い環境では null になるので guarded）
      const { data, error } = await supabase
        .from("hospital_applications")
        .select(
          "id, hospital_id, student_id, status, source, applied_at, hospitals ( id, name )"
        )
        .eq("student_id", user.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;

      const normalized: Application[] = (data ?? []).map((r: any) => ({
        id: String(r.id),
        hospitalId: String(r.hospital_id),
        hospitalName:
          (r.hospitals && r.hospitals.name) ? String(r.hospitals.name) : "(名称未設定)",
        appliedAt: new Date(r.applied_at ?? Date.now()).toISOString(),
        status: toStatus(r.status),
        source: toSource(r.source),
        note: "",
        tags: [],
      }));

      setServerApps(normalized);
    } catch (e: any) {
      console.error("[applications] server load error:", e.message ?? e);
      setServerApps([]);
    } finally {
      setLoading(false);
    }
  };

  /** localStorage 側（MVP一時保存）を取得 */
  const loadFromLocal = () => {
    try {
      const raw = localStorage.getItem(STUDENT_APPS_KEY);
      if (!raw) {
        setLocalApps([]);
        return;
      }
      const arr = JSON.parse(raw) as any[];
      const normalized: Application[] = arr.map((a) => ({
        id: String(a.id),
        hospitalId: String(a.hospitalId),
        hospitalName: String(a.hospitalName ?? "(名称未設定)"),
        appliedAt: new Date(a.appliedAt ?? Date.now()).toISOString(),
        status: toStatus(a.status),
        source: toSource(a.source),
        note: a.note || "",
        tags: a.tags || [],
      }));
      setLocalApps(normalized);
    } catch {
      setLocalApps([]);
    }
  };

  /** 初回とセッション変化で再取得 */
  useEffect(() => {
    loadFromLocal();
    loadFromServer();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadFromServer();
    });
    return () => sub.subscription?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 表示用：サーバー優先でマージ → フィルタ */
  const list = useMemo(() => {
    const map = new Map<string, Application>();
    serverApps.forEach((a) => map.set(a.id, a)); // サーバー優先
    localApps.forEach((a) => { if (!map.has(a.id)) map.set(a.id, a); });

    let arr = Array.from(map.values());
    // キーワード検索（病院名）
    if (q.trim()) {
      const low = q.trim().toLowerCase();
      arr = arr.filter((a) => a.hospitalName.toLowerCase().includes(low));
    }
    // タブ絞り込み
    if (tab !== "すべて") {
      arr = arr.filter((a) => a.status === tab);
    }
    // 日付降順
    arr.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
    return arr;
  }, [serverApps, localApps, tab, q]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* タイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">応募履歴</h1>
        </div>
        {/* 検索 */}
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="病院名で検索"
            className="border rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={loadFromServer}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            title="再読み込み"
          >
            更新
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
          読み込み中…
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
                {/* 将来メッセージスレッドにする場合 */}
                <Link
                  href={`/student/scouts`}
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

/* ===== ユーティリティ ===== */
function toStatus(v: any): ApplicationStatus {
  const s = String(v ?? "選考中") as ApplicationStatus;
  return (["選考中", "面談", "内定", "否決", "取消"] as const).includes(s)
    ? s
    : "選考中";
}
function toSource(v: any): Source {
  const s = String(v ?? "self") as Source;
  return (["scout", "self"] as const).includes(s) ? s : "self";
}