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

  const readRoleCookie = (): Role | undefined => {
    if (typeof document === "undefined") return undefined;
    const m = document.cookie.match(/(?:^|;\s*)role=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : undefined;
    return v === "student" || v === "hospital" ? (v as Role) : undefined;
  };

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
      // RLS で弾かれても onboard が作るのでここは無視
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(undefined);
        setStudent(undefined);
        setHospital(undefined);
        setAuthEmail("");
        setAuthName("");
        return;
      }

      const email = user.email ?? "";
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
      setAuthEmail(email);
      setAuthName(metaName);

      const metaRole =
        (user.user_metadata?.role as Role | undefined) ??
        readRoleCookie() ??
        "student";
      setRole(metaRole);

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
          data ?? { id: user.id, email: email || null, contact_name: metaName || null, hospital_name: null }
        );
        setStudent(undefined);
      }
    } finally {
      // 例外でも確実に false に戻す
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <C.Provider
      value={{
        loading,
        role,
        student,
        hospital,
        displayName,
        refresh: load,
        update,
      }}
    >
      {children}
    </C.Provider>
  );
}