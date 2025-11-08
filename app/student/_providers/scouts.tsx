"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/** スカウト1件 */
export type Scout = {
  id: string;               // scout id
  hospitalId: string;
  hospitalName: string;
  title: string;
  body: string;
  createdAt: string;        // ISO
  readAt?: string | null;   // 既読なら ISO、未読なら undefined/null
};

type ScoutState = {
  scouts: Scout[];
  unreadCount: number;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;   // ★ 追加
  addScouts: (items: Scout[]) => void;
  clear: () => void;
};

const Ctx = createContext<ScoutState | null>(null);
const STORAGE_KEY = "ishimatch:scouts";

export function ScoutsProvider({ children }: { children: React.ReactNode }) {
  const [scouts, setScouts] = useState<Scout[]>([]);

  // 起動時：localStorageからロード
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setScouts(JSON.parse(raw));
    } catch {}
  }, []);

  // 保存 + タブ間同期
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scouts)); } catch {}
  }, [scouts]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setScouts(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<ScoutState>(() => {
    const unreadCount = scouts.filter(s => !s.readAt).length;

    return {
      scouts,
      unreadCount,
      markRead: (id) => {
        setScouts(prev =>
          prev.map(s => s.id === id ? { ...s, readAt: s.readAt ?? new Date().toISOString() } : s),
        );
      },
      // ★ 未読に戻す：readAt を undefined に
      markUnread: (id) => {
        setScouts(prev =>
          prev.map(s => s.id === id ? { ...s, readAt: undefined } : s),
        );
      },
      addScouts: (items) => {
        setScouts(prev => {
          const map = new Map(prev.map(s => [s.id, s]));
          items.forEach(it => map.set(it.id, { ...map.get(it.id), ...it }));
          return Array.from(map.values()).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        });
      },
      clear: () => setScouts([]),
    };
  }, [scouts]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useScouts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useScouts must be used inside <ScoutsProvider>");
  return ctx;
}