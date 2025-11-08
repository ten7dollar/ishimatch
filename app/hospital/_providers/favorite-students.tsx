"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type FavStudent = {
  id: string;
  name: string;
  university: string;
  gradYear: string;
  // 必要に応じて項目を増やせます（学年・興味分野など）
};

type State = {
  favorites: Record<string, FavStudent>;
  isFavorite: (id: string) => boolean;
  addFavorite: (s: FavStudent) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (s: FavStudent) => void;
  clearAll: () => void;
  count: number;
};

const Ctx = createContext<State | null>(null);
// 病院側のキー（学生側と衝突しないように）
const STORAGE_KEY = "ishimatch:hospital:fav:students";

export function FavoriteStudentsProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Record<string, FavStudent>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setFavorites(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<State>(() => ({
    favorites,
    isFavorite: (id) => !!favorites[id],
    addFavorite: (s) => setFavorites(prev => ({ ...prev, [s.id]: s })),
    removeFavorite: (id) => setFavorites(prev => { const x = { ...prev }; delete x[id]; return x; }),
    toggleFavorite: (s) => setFavorites(prev => {
      const x = { ...prev };
      if (x[s.id]) delete x[s.id]; else x[s.id] = s;
      return x;
    }),
    clearAll: () => setFavorites({}),
    count: Object.keys(favorites).length,
  }), [favorites]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useFavoriteStudents() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavoriteStudents must be used inside <FavoriteStudentsProvider>");
  return ctx;
}