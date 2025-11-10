// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/** ここをあなたの Primary ドメインに合わせる */
const CANONICAL_HOST = "ishimatch.vercel.app";

const PUBLIC_PATHS = [
  "/api/session",          // ★ 最優先で許可
  "/login",
  "/signup",
  "/favicon.ico",
  "/robots.txt",
  "/api/contact",
  "/api/supa-health",
];

export async function middleware(req: NextRequest) {
  // --- [追加] 0) 本番は常に Primary ドメインへ 308 リダイレクト（全メソッド）
  //      サブドメイン(ishimatch-xxxx.vercel.app)で来たリクエストを primary に統一
  //      これにより Cookie が常に同じドメインに付与/削除される
  const host = req.headers.get("host") || "";
  if (process.env.VERCEL === "1" && host !== CANONICAL_HOST) {
    const url = req.nextUrl.clone();
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308); // 308 は method/body を保持する
  }

  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // 0) /api/session は supabase 読み込みも含めて完全スルー
  if (pathname === "/api/session") return res;

  // 1) 静的/_next は対象外
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|xml|webp|avif|woff2?)$/i)
  ) return res;

  // 2) supabase → cookie の順で role 判定（try/catch）
  let supaRole: "student" | "hospital" | undefined;
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.role) supaRole = session.user.user_metadata.role;
  } catch {}

  const cookieRole = req.cookies.get("role")?.value as "student"|"hospital"|undefined;
  const role = supaRole ?? cookieRole;

  const isPublic = PUBLIC_PATHS.some((p)=>pathname.startsWith(p));

  if (!role) {
    if (!isPublic && (pathname.startsWith("/student") || pathname.startsWith("/hospital"))) {
      const url = req.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);
    }
    return res;
  }

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    const url = req.nextUrl.clone();
    url.pathname = role === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
    return NextResponse.redirect(url);
  }

  if (role === "student" && pathname.startsWith("/hospital")) {
    const url = req.nextUrl.clone(); url.pathname = "/student/dashboard"; return NextResponse.redirect(url);
  }
  if (role === "hospital" && pathname.startsWith("/student")) {
    const url = req.nextUrl.clone(); url.pathname = "/hospital/dashboard"; return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };