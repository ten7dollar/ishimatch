"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";

/** saved 画面が期待している Hospital 表示型 */
export type Hospital = {
  id: string;             // hospitals_resolved.id（= 学生が見るID）
  name: string;
  prefecture: string;
  area: string;           // = region
  salary: string;         // 例: "348〜482万円" / "-"
  emergency: string;      // 二次/三次/不明 etc
  residents: string;      // 例: "10人/年" or "合計…" / "-"
  beds: string;           // "611床" / "-"
  duty: string;           // "-"
  tags?: string[];
};

type State = {
  favorites: Record<string, Hospital>;
  /** 互換API（既存画面用） */
  isFavorite: (id: string) => boolean;
  addFavorite: (h: Hospital) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  toggleFavorite: (h: Hospital) => Promise<void>;
  clearAll: () => Promise<void>;
  count: number;
  /** 読み込み状態（saved 画面で使用） */
  loading: boolean;
};

const Ctx = createContext<State | null>(null);

/* ---------------------------
   hospitals_resolved → Hospital 整形
--------------------------- */
function normalizeFromResolvedRow(row: any): Hospital {
  const min = row.salary_1st_year_min ?? null;
  const max = row.salary_1st_year_max ?? null;
  const salary =
    min === null && max === null
      ? "-"
      : max === null
      ? `${min}万円`
      : `${min}〜${max}万円`;

  const residents =
    row.residents_first_year != null
      ? `${row.residents_first_year}人/年`
      : row.residents_total != null
      ? `合計${row.residents_total}人`
      : "-";

  return {
    id: String(row.id),
    name: row.name ?? "(名称未設定)",
    prefecture: row.prefecture ?? "",
    area: row.region ?? "",
    salary,
    emergency: row.facility_type ?? "-",
    residents,
    beds: row.bed_count != null ? `${row.bed_count}床` : "-",
    duty: row.duty_frequency ?? "-",
    tags: [],
  };
}

/* ---------------------------
   Provider 本体（B案：2段階取得）
   1) student_favorites を読み込む（hospital_id の配列）
   2) hospitals_resolved を in(id, …) でまとめて取得 → 正規化して Map 化
--------------------------- */
export function FavoriteHospitalsProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowser();
  const [favorites, setFavorites] = useState<Record<string, Hospital>>({});
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  /** 初期ロード：favorites → hospitals_resolved を in(id, …) で取得 */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          userIdRef.current = null;
          setFavorites({});
          return;
        }
        userIdRef.current = user.id;

        // 1) favorites の hospital_id 一覧を取得
        const { data: favRows, error: favErr } = await supabase
          .from("student_favorites")
          .select("hospital_id, created_at")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (favErr) throw favErr;

        const ids = Array.from(
          new Set((favRows ?? []).map((r) => String(r.hospital_id)))
        );
        if (ids.length === 0) {
          setFavorites({});
          return;
        }

        // 2) hospitals_resolved を in(id, …) で取得
        const { data: hsRows, error: hsErr } = await supabase
          .from("hospitals_resolved")
          .select(
            "id, name, prefecture, region, city, bed_count, residents_first_year, residents_total, salary_1st_year_min, salary_1st_year_max, duty_frequency, facility_type"
          )
          .in("id", ids);

        if (hsErr) throw hsErr;

        const map: Record<string, Hospital> = {};
        (hsRows ?? []).forEach((r) => {
          const h = normalizeFromResolvedRow(r);
          map[h.id] = h;
        });
        setFavorites(map);
      } catch (e) {
        console.error("[favorites] load error", e);
        setFavorites({});
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 互換API（既存画面が使っている形） */
  const isFavorite = (id: string) => !!favorites[id];

  const addFavorite = async (h: Hospital) => {
    const studentId = userIdRef.current;
    if (!studentId) return;

    // 先にUIを楽観更新
    setFavorites((prev) => ({ ...prev, [h.id]: h }));
    try {
      const { error } = await supabase
        .from("student_favorites")
        .upsert({ student_id: studentId, hospital_id: h.id });
      if (error) throw error;
    } catch (e) {
      console.error("[favorites] add error", e);
      // 失敗したら戻す
      setFavorites((prev) => {
        const x = { ...prev };
        delete x[h.id];
        return x;
      });
    }
  };

  const removeFavorite = async (id: string) => {
    const studentId = userIdRef.current;
    if (!studentId) return;

    const before = favorites[id];
    setFavorites((prev) => {
      const x = { ...prev };
      delete x[id];
      return x;
    });

    try {
      const { error } = await supabase
        .from("student_favorites")
        .delete()
        .eq("student_id", studentId)
        .eq("hospital_id", id);
      if (error) throw error;
    } catch (e) {
      console.error("[favorites] remove error", e);
      // 失敗したら戻す
      setFavorites((prev) => ({ ...prev, [id]: before }));
    }
  };

  const toggleFavorite = async (h: Hospital) => {
    if (isFavorite(h.id)) {
      await removeFavorite(h.id);
    } else {
      await addFavorite(h);
    }
  };

  const clearAll = async () => {
    const studentId = userIdRef.current;
    if (!studentId) return;
    const before = favorites;
    setFavorites({});
    try {
      const { error } = await supabase
        .from("student_favorites")
        .delete()
        .eq("student_id", studentId);
      if (error) throw error;
    } catch (e) {
      console.error("[favorites] clearAll error", e);
      setFavorites(before);
    }
  };

  const value = useMemo<State>(() => ({
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearAll,
    count: Object.keys(favorites).length,
    loading,
  }), [favorites, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Provider フック */
export function useFavoriteHospitals() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavoriteHospitals must be used inside <FavoriteHospitalsProvider>");
  return ctx;
}