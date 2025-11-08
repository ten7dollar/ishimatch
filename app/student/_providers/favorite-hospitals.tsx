"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Hospital = {
  id: string;
  name: string;
  prefecture: string;
  area: string;
  salary: string;
  emergency: string;
  residents: string;
  beds: string;
  duty: string;
  tags?: string[];
};

type State = {
  favorites: Record<string, Hospital>;
  isFavorite: (id: string) => boolean;
  addFavorite: (h: Hospital) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (h: Hospital) => void;
  clearAll: () => void;
  count: number;
};

const Ctx = createContext<State | null>(null);
const STORAGE_KEY = "ishimatch:fav:hospitals";

export function FavoriteHospitalsProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Record<string, Hospital>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {}
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
    isFavorite: (id: string) => !!favorites[id],
    addFavorite: (h: Hospital) => setFavorites(prev => ({ ...prev, [h.id]: h })),
    removeFavorite: (id: string) => setFavorites(prev => {
      const x = { ...prev }; delete x[id]; return x;
    }),
    toggleFavorite: (h: Hospital) => setFavorites(prev => {
      const x = { ...prev };
      if (x[h.id]) delete x[h.id]; else x[h.id] = h;
      return x;
    }),
    clearAll: () => setFavorites({}),
    count: Object.keys(favorites).length,
  }), [favorites]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useFavoriteHospitals() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavoriteHospitals must be used inside <FavoriteHospitalsProvider>");
  return ctx;
}