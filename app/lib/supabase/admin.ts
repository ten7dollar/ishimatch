// app/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

/** Admin クライアント（Service Role） */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** /api/session で設定した Cookie から role/email/user を読む */
export function readSupabaseUserFromCookie(cookieHeader: string) {
  const out = { role: null as "student" | "hospital" | null, email: null as string | null, userId: null as string | null };
  if (!cookieHeader) return out;

  for (const part of cookieHeader.split(";")) {
    const [kRaw, ...vRaw] = part.trim().split("=");
    const k = decodeURIComponent(kRaw || "");
    const v = decodeURIComponent(vRaw.join("=") || "");
    if (k === "role")  out.role  = (v as any) || null;
    if (k === "email") out.email = v || null;
    if (k === "user")  out.userId = v || null;
  }
  return out;
}

/** public バケット用の簡易URL（avatars の表示に使用） */
export function getPublicUrl(bucket: string, path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const clean = path.replace(new RegExp(`^${bucket}/`), "");
  return `${url}/storage/v1/object/public/${bucket}/${clean}`;
}