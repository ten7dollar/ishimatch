import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 既存の挙動：
 * - 未ログインで /student/* /hospital/* → /login
 * - ログイン済で / または /login|/signup → 自ロールのダッシュ
 * - 学生が /hospital/* へ来たら /student/dashboard へ、病院が /student/* へ来たら /hospital/dashboard へ
 * ここでの「ログイン状態」は cookie "role" を見ます（"student" | "hospital"）。
 */
const PUBLIC_PATHS = ["/login", "/signup", "/api/session", "/api/contact", "/favicon.ico", "/robots.txt"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) 静的ファイル/_next は対象外（500予防のため少し広めに除外）
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|xml|webp|avif|woff2?)$/i)
  ) {
    return NextResponse.next();
  }

  // 2) 既存仕様のまま cookie "role" を参照
  const role = req.cookies.get("role")?.value as "student" | "hospital" | undefined;

  // 3) 未ログイン → /login（ただし公共パスは通す）
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!role) {
    if (!isPublic && (pathname.startsWith("/student") || pathname.startsWith("/hospital"))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 4) ログイン済: / に来たらダッシュへ
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "student" ? "/student/dashboard" : "/hospital/dashboard";
    return NextResponse.redirect(url);
  }

  // 5) ログイン済: /login /signup を開いたら自分のダッシュへ
  if (pathname === "/login" || pathname === "/signup") {
    const url = req.nextUrl.clone();
    url.pathname = role === "student" ? "/student/dashboard" : "/hospital/dashboard";
    return NextResponse.redirect(url);
  }

  // 6) ロールと違うセクションへ来たら自分のダッシュへ
  if (role === "student" && pathname.startsWith("/hospital")) {
    const url = req.nextUrl.clone();
    url.pathname = "/student/dashboard";
    return NextResponse.redirect(url);
  }
  if (role === "hospital" && pathname.startsWith("/student")) {
    const url = req.nextUrl.clone();
    url.pathname = "/hospital/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};