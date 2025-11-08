"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ScoutOutRecord = {
  id: string;                // scout id
  studentId: string;
  studentName: string;
  university: string;
  gradYear: string;
  sentAt: string;            // ISO
  readAt?: string | null;
  appliedAt?: string | null;
};

type OutboxState = {
  records: ScoutOutRecord[];
  // 集計
  sentCount: number;
  readCount: number;
  appliedCount: number;
  unreadCount: number;
  appliedRate: number; // 0-1

  // 操作
  sendScout: (payload: { studentId: string; studentName: string; university: string; gradYear: string }) => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markApplied: (id: string) => void;
  addMocks: (rows: ScoutOutRecord[]) => void;
  clear: () => void;
};

const Ctx = createContext<OutboxState | null>(null);
const STORAGE_KEY = "ishimatch:hospital:scouts";

export function ScoutsOutboxProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<ScoutOutRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecords(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
  }, [records]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setRecords(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<OutboxState>(() => {
    const sentCount = records.length;
    const readCount = records.filter(r => !!r.readAt).length;
    const appliedCount = records.filter(r => !!r.appliedAt).length;
    const unreadCount = sentCount - readCount;
    const appliedRate = sentCount ? appliedCount / sentCount : 0;

    return {
      records,
      sentCount, readCount, appliedCount, unreadCount, appliedRate,

      sendScout: ({ studentId, studentName, university, gradYear }) => {
        const id = `scout-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        setRecords(prev => [{ id, studentId, studentName, university, gradYear, sentAt: now }, ...prev]);
      },
      markRead: (id) => setRecords(prev => prev.map(r => r.id === id ? { ...r, readAt: r.readAt ?? new Date().toISOString() } : r)),
      markUnread: (id) => setRecords(prev => prev.map(r => r.id === id ? { ...r, readAt: undefined } : r)),
      markApplied: (id) => setRecords(prev => prev.map(r => r.id === id ? { ...r, appliedAt: r.appliedAt ?? new Date().toISOString() } : r)),
      addMocks: (rows) => setRecords(prev => {
        const m = new Map(prev.map(r => [r.id, r]));
        rows.forEach(x => m.set(x.id, { ...m.get(x.id), ...x }));
        return Array.from(m.values()).sort((a,b) => b.sentAt.localeCompare(a.sentAt));
      }),
      clear: () => setRecords([]),
    };
  }, [records]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useScoutsOutbox() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useScoutsOutbox must be used inside <ScoutsOutboxProvider>");
  return ctx;
}