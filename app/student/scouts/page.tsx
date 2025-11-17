"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useFavoriteHospitals } from "@/app/student/_providers/favorite-hospitals";

// 画面で使う型
type Row = {
  id: string;
  hospital_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

type Item = {
  id: string;
  hospitalId: string;
  hospitalName: string;
  body: string;
  title: string;       // 1行目をタイトルとして整形
  createdAt: string;
  readAt: string | null;
};

export const dynamic = "force-dynamic";

export default function ScoutInboxPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const { isFavorite, toggleFavorite } = useFavoriteHospitals();

  const [rows, setRows]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = rows.filter(r => !r.readAt).length;

  /** hospitals_resolved から病院名を2段階で引く */
  const mapHospitalNames = async (list: Row[]) => {
    const ids = Array.from(new Set(list.map(r => r.hospital_id)));
    if (ids.length === 0) return new Map<string, string>();
    // hospitals_resolved から id, name を取得
    const { data, error } = await supabase
      .from("hospitals_resolved")
      .select("id,name")
      .in("id", ids);
    if (error) {
      console.error("[scouts] hospitals_resolved error:", error.message);
      return new Map<string, string>();
    }
    const m = new Map<string, string>();
    (data ?? []).forEach((h: any) => m.set(String(h.id), String(h.name)));
    return m;
  };

  const toTitle = (msg: string) => {
    const first = (msg || "").split(/\r?\n/)[0]?.trim() ?? "";
    if (!first) return "病院からスカウトが届きました";
    return first.length > 40 ? first.slice(0, 40) + "…" : first;
  };

  /** 一覧取得 */
  const refresh = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }
      // 1) 自分宛スカウトを取得（新しい順）
      const { data, error } = await supabase
        .from("scout_invitations")
        .select("id,hospital_id,message,created_at,read_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data ?? []) as Row[];

      // 2) 病院名を2段階で補完
      const nameMap = await mapHospitalNames(list);

      const mapped: Item[] = list.map((r) => ({
        id: String(r.id),
        hospitalId: String(r.hospital_id),
        hospitalName: nameMap.get(String(r.hospital_id)) ?? "(名称未設定)",
        body: r.message ?? "",
        title: toTitle(r.message ?? ""),
        createdAt: r.created_at ?? new Date().toISOString(),
        readAt: r.read_at ?? null,
      }));

      setRows(mapped);
    } catch (e: any) {
      console.error("[scouts] refresh error:", e?.message || e);
      alert(`スカウト取得に失敗しました：${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  /** 既読/未読 切替 */
  const markRead = async (id: string) => {
    const target = rows.find(r => r.id === id);
    if (!target || target.readAt) return; // すでに既読なら何もしない
    setRows(prev => prev.map(r => r.id === id ? { ...r, readAt: new Date().toISOString() } : r));
    const { error } = await supabase
      .from("scout_invitations")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[scouts] markRead error:", error.message);
      // 失敗時に戻す
      setRows(prev => prev.map(r => r.id === id ? { ...r, readAt: null } : r));
    }
  };

  const markUnread = async (id: string) => {
    const target = rows.find(r => r.id === id);
    if (!target || !target.readAt) return; // 既に未読なら何もしない
    setRows(prev => prev.map(r => r.id === id ? { ...r, readAt: null } : r));
    const { error } = await supabase
      .from("scout_invitations")
      .update({ read_at: null })
      .eq("id", id);
    if (error) {
      console.error("[scouts] markUnread error:", error.message);
      // 失敗時に戻す
      setRows(prev => prev.map(r => r.id === id ? { ...r, readAt: target.readAt } : r));
    }
  };

  /** 初回取得 + Realtime購読 */
  useEffect(() => {
    refresh();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      ch = supabase
        .channel(`student-scouts:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "scout_invitations",
            filter: `student_id=eq.${user.id}`,
          },
          () => refresh()
        )
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">スカウト</h1>
          <p className="text-gray-600">病院からのスカウトを確認できます（未読 {unreadCount}件）</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 border rounded bg-gray-50 text-center text-gray-500">
          取得中…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border rounded bg-gray-50">
          まだスカウトはありません。
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((s) => {
            const active = isFavorite(s.hospitalId);

            return (
              <div
                key={s.id}
                className={`border rounded-xl p-5 bg-white ${!s.readAt ? "ring-1 ring-primary-300" : ""}`}
                onMouseEnter={() => markRead(s.id)} // hoverで既読化（MVP）
              >
                {/* 見出し */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {!s.readAt && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary-50 text-primary-700">
                          新着
                        </span>
                      )}
                      <h2 className="font-semibold text-primary-700">{s.title}</h2>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* 検討リストに入れるハート（任意） */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite({
                      id: s.hospitalId,
                      name: s.hospitalName,
                      prefecture: "未設定",
                      area: "未設定",
                      salary: "未設定",
                      emergency: "未設定",
                      residents: "未設定",
                      beds: "未設定",
                      duty: "未設定",
                      tags: ["スカウト経由"],
                    }); }}
                    className="p-1 rounded-full"
                    aria-label="お気に入り切り替え"
                    title={active ? "お気に入り解除" : "お気に入りに追加"}
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={active ? "#ef4444" : "transparent"}
                      color={active ? "#ef4444" : "#bbb"}
                    />
                  </button>
                </div>

                {/* 本文 */}
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{s.body}</p>

                {/* CTA：未読に戻す／詳細へ */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => markUnread(s.id)}
                    className="px-3 py-1 rounded border text-sm"
                  >
                    未読に戻す
                  </button>
                  <Link
                    href={`/student/hospitals/${encodeURIComponent(s.hospitalId)}?from=scout=${encodeURIComponent(s.id)}`}
                    className="px-3 py-1 rounded bg-primary-600 text-white text-sm"
                  >
                    詳細を見に行く
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}