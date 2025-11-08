import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/api/session", "/api/contact", "/favicon.ico", "/robots.txt"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 静的ファイル/_next は対象外
  if (
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  const role = req.cookies.get("role")?.value; // "student" | "hospital" | undefined

  // 1) 未ログイン → /login（ただし公共パスは通す）
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!role) {
    if (!isPublic && (pathname.startsWith("/student") || pathname.startsWith("/hospital"))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) ログイン済: / に来たらダッシュへ
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "student" ? "/student/dashboard" : "/hospital/dashboard";
    return NextResponse.redirect(url);
  }

  // 3) ログイン済: /login /signup を開いたら自分のダッシュへ
  if (pathname === "/login" || pathname === "/signup") {
    const url = req.nextUrl.clone();
    url.pathname = role === "student" ? "/student/dashboard" : "/hospital/dashboard";
    return NextResponse.redirect(url);
  }

  // 4) ロールと違うセクションへ来たら自分のダッシュへ
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