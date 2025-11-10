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
  /** ヘッダー表示用（full_name/name → DB の name → email ローカル部） */
  displayName: string;
  /** 外部から再取得したいときに呼ぶ */
  refresh: () => Promise<void>;
  /** アカウント保存時に呼ぶ（学生: name/university/grad_year、病院: contact_name/hospital_name） */
  update: (values: Partial<StudentProfile & HospitalAccount>) => Promise<void>;
};

const C = createContext<Ctx | null>(null);

export const useUserProfile = () => {
  const ctx = useContext(C);
  if (!ctx) {
    throw new Error("useUserProfile must be used within <UserProfileProvider>");
  }
  return ctx;
};

export default function UserProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createSupabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | undefined>(undefined);
  const [hospital, setHospital] = useState<HospitalAccount | undefined>(
    undefined
  );
  const [authEmail, setAuthEmail] = useState<string>(""); // fallback 用
  const [authName, setAuthName] = useState<string>(""); // full_name / name 優先

  // Cookie の role をバックアップとして読む（metadata が無い旧ユーザー救済）
  const readRoleCookie = (): Role | undefined => {
    if (typeof document === "undefined") return undefined;
    const m = document.cookie.match(/(?:^|;\s*)role=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : undefined;
    return v === "student" || v === "hospital" ? v : undefined;
  };

  // DB 側 row が無いときに補完（RLS: self upsert が通る前提）
  const ensureProfileRow = async (
    uid: string,
    r: Role,
    email: string | null,
    name: string | null
  ) => {
    try {
      if (r === "student") {
        const { data } = await supabase
          .from("students")
          .select("id")
          .eq("id", uid)
          .maybeSingle();
        if (!data) {
          await supabase
            .from("students")
            .upsert({ id: uid, email: email ?? null, name: name ?? null });
        }
      } else {
        const { data } = await supabase
          .from("hospital_accounts")
          .select("id")
          .eq("id", uid)
          .maybeSingle();
        if (!data) {
          await supabase.from("hospital_accounts").upsert({
            id: uid,
            email: email ?? null,
            contact_name: name ?? null,
            hospital_name: null,
          });
        }
      }
    } catch {
      // RLS などで弾かれた場合は、onboard が作ってくれるのでここでは無視
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      // auth の情報（full_name → name を優先）
      const email = user.email ?? "";
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
      setAuthEmail(email);
      setAuthName(metaName);

      // role は metadata 優先 + cookie fallback
      const metaRole =
        (user.user_metadata?.role as Role | undefined) ??
        readRoleCookie() ??
        "student";
      setRole(metaRole);

      // DB 側の初期 row が無い場合のみ補完（RLS下）
      await ensureProfileRow(user.id, metaRole, email, metaName || null);

      if (metaRole === "student") {
        const { data } = await supabase
          .from("students")
          .select("id, name, email, university, grad_year")
          .eq("id", user.id)
          .maybeSingle();

        setStudent(
          data ?? {
            id: user.id,
            name: metaName || null,
            email: email || null,
          }
        );
        setHospital(undefined);
      } else {
        const { data } = await supabase
          .from("hospital_accounts")
          .select("id, email, contact_name, hospital_name")
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
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初期ロード
    load();
    // セッション変化で再取得
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // アカウント保存
  const update = async (
    values: Partial<StudentProfile & HospitalAccount>
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !role) return;

    if (role === "student") {
      const payload: Partial<StudentProfile> = {
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.university !== undefined
          ? { university: values.university }
          : {}),
        ...(values.grad_year !== undefined ? { grad_year: values.grad_year } : {}),
      };
      if (Object.keys(payload).length) {
        await supabase.from("students").upsert({ id: user.id, ...payload });
      }
      // Users.metadata は full_name も保存して一覧（Display name）に反映
      if (values.name !== undefined) {
        await supabase
          .auth
          .updateUser({ data: { name: values.name, full_name: values.name } })
          .catch(() => {});
      }
      await load();
    } else {
      const payload: Partial<HospitalAccount> = {
        ...(values.contact_name !== undefined
          ? { contact_name: values.contact_name }
          : {}),
        ...(values.hospital_name !== undefined
          ? { hospital_name: values.hospital_name }
          : {}),
      };
      if (Object.keys(payload).length) {
        await supabase
          .from("hospital_accounts")
          .upsert({ id: user.id, ...payload });
      }
      if (values.contact_name !== undefined || values.hospital_name !== undefined) {
        const nm = values.hospital_name || values.contact_name || null;
        await supabase
          .auth
          .updateUser({ data: { name: nm, full_name: nm || undefined } })
          .catch(() => {});
      }
      await load();
    }
  };

  // 表示名：full_name/name → DB名 → emailローカル部
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
    // student
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