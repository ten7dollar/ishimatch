"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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
  displayName: string;   // ヘッダー表示用に用意
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

  // Cookieのroleをバックアップとして読む（メタデータが無い旧ユーザー救済）
  const readRoleCookie = (): Role | undefined => {
    if (typeof document === "undefined") return undefined;
    const m = document.cookie.match(/(?:^|;\s*)role=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : undefined;
    return v === "student" || v === "hospital" ? v : undefined;
  };

  const ensureProfileRow = async (uid: string, r: Role, email: string | null, name: string | null) => {
    try {
      if (r === "student") {
        const { data, error } = await supabase.from("students").select("id").eq("id", uid).maybeSingle();
        if (!error && !data) {
          await supabase.from("students").upsert({ id: uid, email, name });
        }
      } else {
        const { data, error } = await supabase.from("hospital_accounts").select("id").eq("id", uid).maybeSingle();
        if (!error && !data) {
          await supabase.from("hospital_accounts").upsert({ id: uid, email, contact_name: name, hospital_name: null });
        }
      }
    } catch {
      // RLSやテーブル未作成時は静かにスキップ
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(undefined); setStudent(undefined); setHospital(undefined);
        setLoading(false);
        return;
      }
      // role はメタデータ優先、無ければ cookie
      const metaRole = (user.user_metadata?.role as Role | undefined) ?? readRoleCookie() ?? "student";
      setRole(metaRole);

      // プロファイル行が無ければ自動補完
      await ensureProfileRow(user.id, metaRole, user.email ?? null, (user.user_metadata?.name as string | null) ?? null);

      if (metaRole === "student") {
        const { data } = await supabase.from("students")
          .select("id,name,email,university,grad_year")
          .eq("id", user.id)
          .maybeSingle();
        setStudent(data ?? { id: user.id, name: (user.user_metadata?.name as string | null) ?? null, email: user.email ?? null });
        setHospital(undefined);
      } else {
        const { data } = await supabase.from("hospital_accounts")
          .select("id,email,contact_name,hospital_name")
          .eq("id", user.id)
          .maybeSingle();
        setHospital(data ?? { id: user.id, email: user.email ?? null, contact_name: (user.user_metadata?.name as string | null) ?? null, hospital_name: null });
        setStudent(undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初回ロード
    load();
    // セッション変化で再読込
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { sub?.subscription?.unsubscribe?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // プロファイル更新API（ページの「保存」から呼べる）
  const update = async (values: Partial<StudentProfile & HospitalAccount>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !role) return;
    if (role === "student") {
      const payload: Partial<StudentProfile> = {
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.university !== undefined ? { university: values.university } : {}),
        ...(values.grad_year !== undefined ? { grad_year: values.grad_year } : {}),
      };
      if (Object.keys(payload).length) {
        await supabase.from("students").update(payload).eq("id", user.id);
      }
      if (values.name !== undefined) {
        await supabase.auth.updateUser({ data: { name: values.name } }).catch(() => {});
      }
      await load();
    } else {
      const payload: Partial<HospitalAccount> = {
        ...(values.contact_name !== undefined ? { contact_name: values.contact_name } : {}),
        ...(values.hospital_name !== undefined ? { hospital_name: values.hospital_name } : {}),
      };
      if (Object.keys(payload).length) {
        await supabase.from("hospital_accounts").update(payload).eq("id", user.id);
      }
      if (values.contact_name !== undefined) {
        await supabase.auth.updateUser({ data: { name: values.contact_name } }).catch(() => {});
      }
      await load();
    }
  };

  const displayName = useMemo(() => {
    if (role === "student") {
      return (student?.name && student.name.trim()) || (student?.email?.split("@")[0] ?? "あなた");
    }
    if (role === "hospital") {
      return (hospital?.hospital_name && hospital.hospital_name.trim())
          || (hospital?.contact_name && hospital.contact_name.trim())
          || (hospital?.email?.split("@")[0] ?? "病院アカウント");
    }
    return "";
  }, [role, student, hospital]);

  const value: Ctx = { loading, role, student, hospital, displayName, refresh: load, update };

  return <C.Provider value={value}>{children}</C.Provider>;
}