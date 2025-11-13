"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** hospitals から一覧カードで必要なフィールドだけ */
export type HospitalMini = {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  city: string | null;
  facility_type: "二次救急" | "三次救急" | "どちらでも" | "不明";
  bed_count: number | null;
  residents_first_year: number | null;
  salary_1st_year_min: number | null;
  salary_1st_year_max: number | null;
  duty_frequency: "~2回" | "3~4回" | "5回以上" | "特になし" | null;
};

export type FavoriteRow = {
  hospital_id: string;
  created_at: string;
  hospitals: HospitalMini;        // ← 単一
};

type Api = {
  loading: boolean;
  list: FavoriteRow[];
  refresh: () => Promise<void>;
  toggle: (hospitalId: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

export function useDbFavorites(): Api {
  const sb = useMemo(() => createSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<FavoriteRow[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        setList([]);
        return;
      }

      const { data, error } = await sb
        .from("student_favorites")
        .select(
          `
            hospital_id,
            created_at,
            hospitals (
              id,
              name,
              prefecture,
              region,
              city,
              facility_type,
              bed_count,
              residents_first_year,
              salary_1st_year_min,
              salary_1st_year_max,
              duty_frequency
            )
          `
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // --- ここで JOIN 結果を正規化：配列なら先頭を採用 ---
      const normalized: FavoriteRow[] = (data ?? []).map((r: any) => {
        const h = Array.isArray(r.hospitals) ? (r.hospitals[0] ?? null) : r.hospitals;
        return {
          hospital_id: String(r.hospital_id),
          created_at: String(r.created_at),
          hospitals: h as HospitalMini, // 期待する shape に合わせる
        };
      });

      setList(normalized);
    } finally {
      setLoading(false);
    }
  }, [sb]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (hospitalId: string) => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const exists = list.some((r) => r.hospital_id === hospitalId);
      if (exists) {
        await sb
          .from("student_favorites")
          .delete()
          .eq("student_id", user.id)
          .eq("hospital_id", hospitalId);
      } else {
        await sb
          .from("student_favorites")
          .upsert({ student_id: user.id, hospital_id: hospitalId });
      }
      await refresh();
    },
    [sb, list, refresh]
  );

  const clearAll = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("student_favorites").delete().eq("student_id", user.id);
    await refresh();
  }, [sb, refresh]);

  return { loading, list, refresh, toggle, clearAll };
}