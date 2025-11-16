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
  hospital_id?: string | null; // ← 追加：公開レコード(hospitals.id)との紐付け
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

/* ---------- utilities ---------- */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** supabase.getSession が遅い/返らない対策：短いタイムアウト付き＋localStorage フォールバック */
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
  return readSessionFromLocalStorage();
}

/* ---------- provider ---------- */

export default function UserProfileProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | undefined>(undefined);
  const [hospital, setHospital] = useState<HospitalAccount | undefined>(undefined);

  // すぐ表示するための auth 由来の値
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");

  const readRoleCookie = useCallback((): Role | undefined => {
    const v = readCookie("role");
    return v === "student" || v === "hospital" ? (v as Role) : undefined;
  }, []);

  /** DBロウが無ければ補完（冪等） */
  const ensureProfileRow = useCallback(
    async (uid: string, r: Role, email: string | null, name: string | null) => {
      try {
        if (r === "student") {
          const { data } = await supabase.from("students").select("id").eq("id", uid).maybeSingle();
          if (!data) {
            await supabase.from("students").upsert({ id: uid, email, name });
          }
        } else {
          const { data } = await supabase.from("hospital_accounts").select("id").eq("id", uid).maybeSingle();
          if (!data) {
            // ← ここで hospital_id = id を既定リンク（初回作成保険）
            await supabase
              .from("hospital_accounts")
              .upsert({ id: uid, email, contact_name: name, hospital_name: null, hospital_id: uid });
          }
        }
      } catch {
        // adminの /api/onboard が作っている前提。ここでの失敗は致命ではないため握りつぶし
      }
    },
    [supabase]
  );

  /** メインロード：localStorage → getSession → DB 補正（病院は hospital_id の自動リンクを追加） */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1) まず localStorage から即時表示
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
        setLoading(false); // ← ここで “…” を先に解除
      }

      // 2) その裏で正式に getSession()（タイムアウト付き）
      const session = await getSessionWithFallback(supabase);
      if (!session?.user) {
        // ログアウト済み or セッション未初期化
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      const email = session.user.email ?? "";
      const meta = session.user.user_metadata ?? {};
      const metaName: string = (meta.full_name as string) || (meta.name as string) || "";
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
        setStudent(data ?? { id: session.user.id, name: metaName || null, email: email || null });
        setHospital(undefined);
      } else {
        // 病院アカウントを取得（hospital_id を含めて確認）
        const { data: ha } = await supabase
          .from("hospital_accounts")
          .select("id,email,contact_name,hospital_name,hospital_id")
          .eq("id", session.user.id)
          .maybeSingle();

        // hospital_id が未設定なら、自動で id を紐付け（初回保険）
        if (ha && !ha.hospital_id) {
          try {
            await supabase
              .from("hospital_accounts")
              .update({ hospital_id: session.user.id })
              .eq("id", session.user.id);
            // 更新後の値で埋め直し
            ha.hospital_id = session.user.id;
          } catch {
            // 握りつぶし（公開に影響が出るのは View 合成時だが、保険なので止めない）
          }
        }

        setHospital(
          ha ?? { id: session.user.id, email: email || null, contact_name: metaName || null, hospital_name: null, hospital_id: session.user.id }
        );
        setStudent(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [ensureProfileRow, readRoleCookie, supabase]);

  /** 起動時 + タブ間同期 */
  useEffect(() => {
    load();
    // Supabase 側のトークン自動更新や signIn/signOut を拾う
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    // 他タブでトークンが更新された場合にも追従
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

  /** Users(metadata) + DB を同時更新 */
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
          await supabase.auth.updateUser({ data: { name: values.name, full_name: values.name } }).catch(() => {});
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
          await supabase.auth.updateUser({ data: { name: nm, full_name: nm || undefined } }).catch(() => {});
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