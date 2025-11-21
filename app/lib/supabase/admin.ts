// app/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

// --- Admin client (Service Role)
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false }, // Server-side only
  });
}

// --- Cookie からアプリのセッション情報を読む（Route 側で cookie 文字列を渡す）
export type CookieSession = {
  userId: string | null;                    // 将来 userId を入れたくなった時用。今は null の可能性大
  role: "student" | "hospital" | null;      // /api/session でセットした role
  email: string | null;                     // /api/session でセットした email
};

/**
 * Set-Cookie で入っている文字列を Map に変換
 * 例: "a=1; role=student; email=foo%40example.com"
 */
function parseCookieHeader(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  header.split(/; */).forEach((pair) => {
    if (!pair) return;
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = decodeURIComponent(pair.slice(0, idx).trim());
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    if (k) map.set(k, v);
  });
  return map;
}

/**
 * Cookie から { role, email, userId } を取り出す。
 * 既存の /api/session が `role` と `email` を Set-Cookie している前提。
 * userId は現状 Cookie に入れていないため null のことが多い。
 */
export function readSupabaseUserFromCookie(
  cookieHeader: string | null
): CookieSession {
  const jar = parseCookieHeader(cookieHeader);
  // ここはあなたの /api/session の実装に合わせてキー名を変更してください
  const role =
    (jar.get("role") as "student" | "hospital" | null) ?? null;
  const email = jar.get("email") ?? null;

  // 将来的に userId も Cookie に入れるなら、ここで拾う
  const userId =
    jar.get("userId") ?? jar.get("uid") ?? jar.get("app_user_id") ?? null;

  return { userId, role, email };
}

// ----------------------------------------------
// 以下はすでに使っていたストレージ用の小ヘルパー（必要に応じて）
// ----------------------------------------------
const supabaseAdmin = createSupabaseAdmin();

/**
 * 例）アバターの public URL を発行したいときのサインドURL作成（必要なら利用）
 */
export async function createAvatarSignedUrl(
  userId: string,
  filePath = "avatar.png",
  expiresInSec = 60 * 5
) {
  const path = `${userId}/${filePath}`.replace(/^\/+/, ""); // normalize
  const { data, error } = await supabaseAdmin.storage
    .from("avatars")
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return { ...data, key: path };
}

/**
 * すでに public なファイルの URL を得たい場合
 * 例）getPublicUrl('avatars', `${userId}/avatar.png`)
 */
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(
    path.replace(/^\/+/, "")
  );
  return data?.publicUrl ?? "";
}