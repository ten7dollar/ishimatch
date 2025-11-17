"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "../lib/supabase/client";

/* =========================
   Types
========================= */
type Role = "student" | "hospital";

type StudentProfile = {
  id: string;
  name: string | null;
  email: string | null;
  university?: string | null;
  grad_year?: number | null;
};

type HospitalAccount = {
  id: string;                 // = auth.uid()
  email: string | null;
  contact_name?: string | null;
  hospital_name?: string | null;
  hospital_id?: string | null; // 公開テーブル(hospitals.id) との紐付け
};

type Ctx = {
  loading: boolean;
  role?: Role;
  student?: StudentProfile;
  hospital?: HospitalAccount;
  displayName: string;
  refresh: () => Promise<void>;
  update: (values: Partial<StudentProfile & HospitalAccount>) => Promise<void>;
};

const C = createContext<Ctx | null>(null);
export const useUserProfile = () => {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useUserProfile must be used within <UserProfileProvider/>");
  return ctx;
};

/* =========================
   Utilities
========================= */
const readCookie = (key: string) => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
};

/** localStorage の sb-xxx-auth-token を読み、session 風のオブジェクトを返す */
function readSessionFromLocalStorage() {
  try {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const json = JSON.parse(raw);
    return json?.currentSession ?? json?.session ?? null;
  } catch {
    return null;
  }
}

/** supabase.getSession が遅い/返らない対策：短いタイムアウト＋LocalStorage フォールバック */
async function getSessionWithFallback(sb: SupabaseClient) {
  try {
    const r = await Promise.race([
      sb.auth.getSession(),
      new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: new Error("timeout") }), 800)
      ),
    ]);
    if (r?.data?.session) return r.data.session;
  } catch {}
  return readSessionFromLocalStorage();
}

/* =========================
   Provider
========================= */
export default function UserProfileProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | undefined>(undefined);
  const [hospital, setHospital] = useState<HospitalAccount | undefined>(undefined);

  // ヘッダー表示用の即時値
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");

  const readRoleCookie = useCallback((): Role | undefined => {
    const v = readCookie("role");
    return v === "student" || v === "hospital" ? (v as Role) : undefined;
  }, []);

  /** DB 行が無い場合に補完（冪等） */
  const ensureProfileRow = useCallback(
    async (uid: string, r: Role, email: string | null, name: string | null) => {
      try {
        if (r === "student") {
          const { data } = await supabase
            .from("students")
            .select("id")
            .eq("id", uid)
            .maybeSingle();
          if (!data) {
            await supabase.from("students").upsert({ id: uid, email, name });
          }
        } else {
          const { data } = await supabase
            .from("hospital_accounts")
            .select("id")
            .eq("id", uid)
            .maybeSingle();
          if (!data) {
            // ★ 初回保険：公開IDの claim → hospital_id = id として作っておく
            await supabase
              .from("hospital_accounts")
              .upsert({ id: uid, email, contact_name: name, hospital_name: null, hospital_id: uid });
          }
        }
      } catch {
        // /api/onboard などで作られている前提。失敗は致命ではないため握りつぶす
      }
    },
    [supabase]
  );

  /** main loader：LocalStorage → getSession → DB 取得/補正 */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1) localStorage（即時表示）
      const ls = readSessionFromLocalStorage();
      if (ls?.user) {
        const u = ls.user;
        const nm =
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          "";
        setAuthEmail(u.email ?? "");
        setAuthName(nm);
        setRole((u.user_metadata?.role as Role) || readRoleCookie() || "student");
        setLoading(false); // ← “…” を先に解除
      }

      // 2) 正式に getSession（タイムアウトあり）
      const session = await getSessionWithFallback(supabase);
      if (!session?.user) {
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      const email = session.user.email ?? "";
      const meta  = session.user.user_metadata ?? {};
      const metaName: string =
        (meta.full_name as string) || (meta.name as string) || "";
      const r: Role = (meta.role as Role) || readRoleCookie() || "student";
      setRole(r);

      // 3) row を保証（冪等）
      await ensureProfileRow(session.user.id, r, email || null, metaName || null);

      if (r === "student") {
        const { data } = await supabase
          .from("students")
          .select("id,name,email,university,grad_year")
          .eq("id", session.user.id)
          .maybeSingle();

        setStudent(
          data ?? { id: session.user.id, name: metaName || null, email: email || null }
        );
        setHospital(undefined);
      } else {
        // 病院アカウント取得（hospital_id の claim 保険含む）
        const { data: ha } = await supabase
          .from("hospital_accounts")
          .select("id,email,contact_name,hospital_name,hospital_id")
          .eq("id", session.user.id)
          .maybeSingle();

        // ★ hospital_id が未セットなら、id で自動 claim
        if (ha && !ha.hospital_id) {
          try {
            await supabase
              .from("hospital_accounts")
              .update({ hospital_id: session.user.id })
              .eq("id", session.user.id);
            ha.hospital_id = session.user.id;
          } catch {
            // 握りつぶし
          }
        }

        setHospital(
          ha ?? {
            id: session.user.id,
            email: email || null,
            contact_name: metaName || null,
            hospital_name: null,
            hospital_id: session.user.id, // claim 保険
          }
        );
        setStudent(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [ensureProfileRow, readRoleCookie, supabase]);

  /** 起動時 + セッション更新 + 他タブ連携 */
  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    const onStorage = (ev: StorageEvent) => {
      if (ev.key && ev.key.includes("auth-token")) load();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      try { sub.subscription?.unsubscribe?.(); } catch {}
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Users(metadata) + DB を同時更新（病院は hospital_id の更新も許可） */
  const update = useCallback(
    async (values: Partial<StudentProfile & HospitalAccount>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !role) return;

      if (role === "student") {
        const payload: Partial<StudentProfile> = {
          ...(values.name        !== undefined ? { name: values.name } : {}),
          ...(values.university  !== undefined ? { university: values.university } : {}),
          ...(values.grad_year   !== undefined ? { grad_year: values.grad_year } : {}),
        };
        if (Object.keys(payload).length) {
          await supabase.from("students").upsert({ id: user.id, ...payload });
        }
        if (values.name !== undefined) {
          await supabase.auth
            .updateUser({ data: { name: values.name, full_name: values.name } })
            .catch(() => {});
        }
        await load();
      } else {
        const payload: Partial<HospitalAccount> = {
          ...(values.contact_name  !== undefined ? { contact_name: values.contact_name } : {}),
          ...(values.hospital_name !== undefined ? { hospital_name: values.hospital_name } : {}),
          ...(values.hospital_id   !== undefined ? { hospital_id: values.hospital_id } : {}),
        };
        if (Object.keys(payload).length) {
          await supabase.from("hospital_accounts").upsert({ id: user.id, ...payload });
        }
        if (values.contact_name !== undefined || values.hospital_name !== undefined) {
          const nm = values.hospital_name || values.contact_name || null;
          await supabase.auth
            .updateUser({ data: { name: nm, full_name: nm || undefined } })
            .catch(() => {});
        }
        await load();
      }
    },
    [load, role, supabase]
  );

  /** 表示名：full_name → name → DB → email ローカル部 */
  const displayName = useMemo(() => {
    const emailLocal = authEmail ? authEmail.split("@")[0] : "";
    if (role === "hospital") {
      return (
        hospital?.hospital_name?.trim?.() ||
        hospital?.contact_name?.trim?.() ||
        authName?.trim?.() ||
        emailLocal
      );
    }
    return student?.name?.trim?.() || authName?.trim?.() || emailLocal;
  }, [role, student, hospital, authName, authEmail]);

  const value: Ctx = {
    loading,
    role,
    student,
    hospital,
    displayName,
    refresh: load,
    update,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}