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

type Role = "student" | "hospital";

type StudentProfile = {
  id: string;
  name: string | null;
  email: string | null;
  university?: string | null;
  grad_year?: number | null;
};

type HospitalAccount = {
  id: string;
  email: string | null;
  contact_name?: string | null;
  hospital_name?: string | null;
};

type Ctx = {
  loading: boolean;
  role?: Role;
  student?: StudentProfile;
  hospital?: HospitalAccount;
  /** ヘッダー表示用：full_name → name → DB → emailローカル部 */
  displayName: string;
  refresh: () => Promise<void>;
  /** Users(metadata) & DB を同時に upsert */
  update: (values: Partial<StudentProfile & HospitalAccount>) => Promise<void>;
};

const C = createContext<Ctx | null>(null);

export const useUserProfile = () => {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useUserProfile must be used within <UserProfileProvider/>");
  return ctx;
};

/* ========================== */
/*     internal utilities     */
/* ========================== */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const readCookie = (key: string) => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
};

/** getSession が pending/null でも LocalStorage から復元する */
async function getSessionWithFallback(sb: SupabaseClient) {
  try {
    const r = await Promise.race([
      sb.auth.getSession(),
      new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: new Error("timeout") }), 800)
      ),
    ]);
    if (r?.data?.session) return r.data.session;
  } catch {
    // swallow
  }
  // localStorage フォールバック
  try {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    if (key) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const json = JSON.parse(raw);
        return json?.currentSession ?? json?.session ?? null;
      }
    }
  } catch {
    // swallow
  }
  return null;
}

/* ========================== */
/*      provider component    */
/* ========================== */

export default function UserProfileProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | undefined>(undefined);
  const [hospital, setHospital] = useState<HospitalAccount | undefined>(undefined);

  // 表示用の auth 由来の即時値（full_name / name / email）
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");

  const readRoleCookie = useCallback((): Role | undefined => {
    if (typeof document === "undefined") return undefined;
    const v = readCookie("role");
    return v === "student" || v === "hospital" ? (v as Role) : undefined;
  }, []);

  const ensureProfileRow = useCallback(
    async (uid: string, r: Role, email: string | null, name: string | null) => {
      try {
        if (r === "student") {
          const { data } = await supabase.from("students").select("id").eq("id", uid).maybeSingle();
          if (!data) await supabase.from("students").upsert({ id: uid, email, name });
        } else {
          const { data } = await supabase.from("hospital_accounts").select("id").eq("id", uid).maybeSingle();
          if (!data) await supabase.from("hospital_accounts").upsert({ id: uid, email, contact_name: name, hospital_name: null });
        }
      } catch {
        // admin 側 /api/onboard が既に作成しているはず。ここは失敗しても致命ではない。
      }
    },
    [supabase]
  );

  /** セッションとDBを読み、先にヘッダーだけは必ず出す */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getSessionWithFallback(supabase);

      if (!session?.user) {
        // 未ログイン
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      // まずは auth 情報から表示名を決定（フルスピードで “…” を脱出）
      const email = session.user.email ?? "";
      const meta = session.user.user_metadata ?? {};
      const immediateName: string =
        (meta.full_name as string) || (meta.name as string) || "";
      setAuthEmail(email);
      setAuthName(immediateName);
      setLoading(false); // ← ここで先にヘッダー表示を確定

      // role を確定（metadata → cookie）
      const r: Role =
        (meta.role as Role | undefined) ?? readRoleCookie() ?? "student";
      setRole(r);

      // DB ロウの保証 → 詳細の取得（表示はすでに出ている）
      await ensureProfileRow(session.user.id, r, email || null, immediateName || null);

      if (r === "student") {
        const { data } = await supabase
          .from("students")
          .select("id,name,email,university,grad_year")
          .eq("id", session.user.id)
          .maybeSingle();

        setStudent(
          data ?? { id: session.user.id, name: immediateName || null, email: email || null }
        );
        setHospital(undefined);
      } else {
        const { data } = await supabase
          .from("hospital_accounts")
          .select("id,email,contact_name,hospital_name")
          .eq("id", session.user.id)
          .maybeSingle();

        setHospital(
          data ?? { id: session.user.id, email: email || null, contact_name: immediateName || null, hospital_name: null }
        );
        setStudent(undefined);
      }
    } finally {
      setLoading(false); // どの経路でも解除
    }
  }, [ensureProfileRow, readRoleCookie, supabase]);

  useEffect(() => {
    load();
    // セッション変動時の再取得
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      try { sub.subscription?.unsubscribe?.(); } catch {}
    };
  }, [load, supabase]);

  /** Users(metadata) + DB を両方 upsert */
  const update = useCallback(
    async (values: Partial<StudentProfile & HospitalAccount>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !role) return;

      if (role === "student") {
        const payload: Partial<StudentProfile> = {
          ...(values.name !== undefined ? { name: values.name } : {}),
          ...(values.university !== undefined ? { university: values.university } : {}),
          ...(values.grad_year !== undefined ? { grad_year: values.grad_year } : {}),
        };
        if (Object.keys(payload).length) {
          await supabase.from("students").upsert({ id: user.id, ...payload });
        }
        if (values.name !== undefined) {
          await supabase.auth.updateUser({ data: { name: values.name, full_name: values.name } }).catch(() => {});
        }
        await load();
      } else {
        const payload: Partial<HospitalAccount> = {
          ...(values.contact_name !== undefined ? { contact_name: values.contact_name } : {}),
          ...(values.hospital_name !== undefined ? { hospital_name: values.hospital_name } : {}),
        };
        if (Object.keys(payload).length) {
          await supabase.from("hospital_accounts").upsert({ id: user.id, ...payload });
        }
        if (values.contact_name !== undefined || values.hospital_name !== undefined) {
          const nm = values.hospital_name || values.contact_name || null;
          await supabase.auth.updateUser({ data: { name: nm, full_name: nm || undefined } }).catch(() => {});
        }
        await load();
      }
    },
    [load, role, supabase]
  );

  /** ヘッダー表示名：full_name → name → DB → email ローカル部 */
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