// app/lib/storage/url.ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * students.avatar_url（例: 'avatars/<uid>/avatar.png'）を
 * 公開URLに変換する。
 * すでに https:// ならそのまま返す。
 */
export function toPublicAvatarUrl(avatarPath?: string | null): string | null {
  if (!avatarPath) return null;
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;

  const base = SUPABASE_URL.replace(/\/+$/, "");
  // avatarPath が 'avatars/...' の前提
  return `${base}/storage/v1/object/public/${avatarPath.replace(/^\/+/, "")}`;
}