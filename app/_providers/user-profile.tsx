"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  update: (values: Partial<StudentProfile & HospitalAccount>) => Promise<void>;
};

const C = createContext<Ctx | null>(null);

export const useUserProfile = () => {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useUserProfile must be used within <UserProfileProvider/>");
  return ctx;
};

/** 短い待機 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** getSession がハング/遅延する環境用に LocalStorage からのフォールバックを実装 */
async function getSessionWithFallback(sb: SupabaseClient) {
  try {
    // getSession の最初の応答を最大 800ms 待つ
    const res = await Promise.race([
      sb.auth.getSession(),
      new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: new Error("timeout") }), 800)
      ),
    ]);

    if (res?.data?.session) return res.data.session;
  } catch {
    // noop
  }

  // LocalStorage から直接読む（sb-<projectRef>-auth-token）
  try {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    if (key) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const json = JSON.parse(raw);
        // v2 は currentSession に、v1 互換を考えて session も見る
        return json?.currentSession ?? json?.session ?? null;
      }
    }
  } catch {
    // noop
  }

  return null;
}

export default function UserProfileProvider({ children }: { children: ReactNode }) {
  const supabase = createSupabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | undefined>(undefined);
  const [hospital, setHospital] = useState<HospitalAccount | undefined>(undefined);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");

  /** Cookie の role をバックアップとして読む（metadata が無い旧ユーザー救済） */
  const readRoleCookie = (): Role | undefined => {
    if (typeof document === "undefined") return undefined;
    const m = document.cookie.match(/(?:^|;\s*)role=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : undefined;
    return v === "student" || v === "hospital" ? (v as Role) : undefined;
  };

  /** DBロウが無ければ補完（RLS self upsert 前提・onboard 済みなら冪等にスキップ） */
  const ensureProfileRow = async (
    uid: string,
    r: Role,
    email: string | null,
    name: string | null
  ) => {
    try {
      if (r === "student") {
        const { data } = await supabase.from("students").select("id").eq("id", uid).maybeSingle();
        if (!data) await supabase.from("students").upsert({ id: uid, email, name });
      } else {
        const { data } = await supabase.from("hospital_accounts").select("id").eq("id", uid).maybeSingle();
        if (!data) await supabase.from("hospital_accounts").upsert({ id: uid, email, contact_name: name, hospital_name: null });
      }
    } catch {
      // onboard が作っているはずなので握りつぶす
    }
  };

  /** セッション + DB 取得（getSession + 短いリトライ + LocalStorage フォールバック） */
  const load = async () => {
    setLoading(true);
    try {
      const session = await getSessionWithFallback(supabase);

      // ログアウト状態
      if (!session) {
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      const email = session.user?.email ?? "";
      const meta = session.user?.user_metadata || {};
      const metaName: string =
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        "";

      // 先に表示用の値をセットして “…” を解除
      setAuthEmail(email);
      setAuthName(metaName);
      setLoading(false);

      // role の決定（metadata → cookie の順）
      const r: Role =
        (meta.role as Role | undefined) ??
        readRoleCookie() ??
        "student";
      setRole(r);

      // DB 行の冪等補完
      await ensureProfileRow(session.user.id, r, email || null, metaName || null);

      // DB 本体取得（表示はすでに authName で出ている）
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
        const { data } = await supabase
          .from("hospital_accounts")
          .select("id,email,contact_name,hospital_name")
          .eq("id", session.user.id)
          .maybeSingle();

        setHospital(
          data ?? {
            id: session.user.id,
            email: email || null,
            contact_name: metaName || null,
            hospital_name: null,
          }
        );
        setStudent(undefined);
      }
    } finally {
      // 念のため二重で解除（途中 return でも確実に false になる）
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      try { sub.subscription?.unsubscribe?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Users metadata（full_name/name）＋ DB を更新 */
  const update = async (values: Partial<StudentProfile & HospitalAccount>) => {
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
  };

  /** ヘッダー表示名：full_name → name → DB → email ローカル部 */
  const displayName = useMemo(() => {
    const emailLocal = authEmail ? authEmail.split("@")[0] : "";
    if (role === "hospital") {
      return (
        hospital?.hospital_name?.trim() ||
        hospital?.contact_name?.trim() ||
        authName?.trim() ||
        emailLocal
      );
    }
    return student?.name?.trim() || authName?.trim() || emailLocal;
  }, [role, student, hospital, authName, authEmail]);

  const value: Ctx = { loading, role, student, hospital, displayName, refresh: load, update };

  return <C.Provider value={value}>{children}</C.Provider>;
}