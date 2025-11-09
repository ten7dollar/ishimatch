import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// ★ /api/session を必ず含める（ログイン/ログアウト時に利用）
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/api/session",
  "/favicon.ico",
  "/robots.txt",
  // もしヘルス等があれば必要に応じて
  "/api/supa-health",
  "/api/contact",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // 静的/_next は対象外
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|xml|webp|avif|woff2?)$/i)
  ) {
    return res;
  }

  // Supabaseからroleを読めるなら使い、なければcookie roleをフォールバック
  let supaRole: "student" | "hospital" | undefined;
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.role) supaRole = session.user.user_metadata.role;
  } catch { /* noop */ }

  const cookieRole = req.cookies.get("role")?.value as "student" | "hospital" | undefined;
  const role = supaRole ?? cookieRole;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 未ログイン → /login（公共パスは通す）
  if (!role) {
    if (!isPublic && (pathname.startsWith("/student") || pathname.startsWith("/hospital"))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return res;
  }

  // ログイン済: / or /login|/signup → ロール別ダッシュ
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    const url = req.nextUrl.clone();
    url.pathname = role === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
    return NextResponse.redirect(url);
  }

  // ロール違いセクションを防ぐ
  if (role === "student" && pathname.startsWith("/hospital")) {
    const url = req.nextUrl.clone(); url.pathname = "/student/dashboard"; return NextResponse.redirect(url);
  }
  if (role === "hospital" && pathname.startsWith("/student")) {
    const url = req.nextUrl.clone(); url.pathname = "/hospital/dashboard"; return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };