"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
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

  /** DBロウが無ければ補完（RLS self upsert を想定。onboard 済ならスキップされる） */
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
      // RLSで弾かれても onboard が作成済みのはずなので握りつぶす
    }
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** セッション + DB 取得（getSession + 短いリトライ入り） */
  const load = async () => {
    setLoading(true);
    try {
      // 初回マウントで null のことがあるため短いリトライを入れる
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await wait(150);
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!session) {
        await wait(300);
        ({ data: { session } } = await supabase.auth.getSession());
      }

      const user = session?.user ?? null;
      if (!user) {
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      const email = user.email ?? "";
      // full_name → name を最優先で保持（Users の Display name 表示に一致）
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
      setAuthEmail(email);
      setAuthName(metaName);

      // role は metadata → cookie の順に決定
      const metaRole =
        (user.user_metadata?.role as Role | undefined) ??
        readRoleCookie() ??
        "student";
      setRole(metaRole);

      // DB 行が無い場合は冪等に補完
      await ensureProfileRow(user.id, metaRole, email, metaName || null);

      if (metaRole === "student") {
        const { data } = await supabase
          .from("students")
          .select("id,name,email,university,grad_year")
          .eq("id", user.id)
          .maybeSingle();

        setStudent(
          data ?? { id: user.id, name: metaName || null, email: email || null }
        );
        setHospital(undefined);
      } else {
        const { data } = await supabase
          .from("hospital_accounts")
          .select("id,email,contact_name,hospital_name")
          .eq("id", user.id)
          .maybeSingle();

        setHospital(
          data ?? {
            id: user.id,
            email: email || null,
            contact_name: metaName || null,
            hospital_name: null,
          }
        );
        setStudent(undefined);
      }
    } finally {
      // 例外でも必ず false にする（"…" に張り付かない）
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // セッション変化時の再取得（購読解除は正しいパスで）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** アカウント保存（Users metadata と DB を両方更新） */
  const update = async (values: Partial<StudentProfile & HospitalAccount>) => {
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
        // Users 一覧の Display name 列にも出るよう full_name も保存
        await supabase.auth
          .updateUser({ data: { name: values.name, full_name: values.name } })
          .catch(() => {});
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
        await supabase.auth
          .updateUser({ data: { name: nm, full_name: nm || undefined } })
          .catch(() => {});
      }
      await load();
    }
  };

  /** 表示名：full_name → name → DB → emailローカル部 */
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