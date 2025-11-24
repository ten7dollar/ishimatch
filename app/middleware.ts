// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/** あなたの Primary ドメイン */
const CANONICAL_HOST = "ishimatch.vercel.app";

/** ログイン不要で通すパス（prefix 判定） */
const PUBLIC_PATHS = [
  "/api/session",   // ★ 最優先で許可（Cookie 発行/削除のため）
  "/api/onboard",   // サインアップ直後の初期レコード作成
  "/api/contact",
  "/api/supa-health",
  "/login",
  "/signup",
  "/favicon.ico",
  "/robots.txt",
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = url.hostname; // 'host' ではなく 'hostname' を比較
  const pathname = url.pathname;

  // 0) 本番は Primary ドメインに統一（サブドメイン、preview URL、古い Alias 等の揺れを排除）
  if (
    process.env.NODE_ENV === "production" &&
    hostname !== CANONICAL_HOST &&
    !hostname.endsWith(".vercel.live") && // preview 実行時の vercel ライブドメインは開発用に許可
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  ) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = CANONICAL_HOST; // ポートを含めないため 'hostname' を使用
    // 308 は method/body を保持。API も統一したいならこのままでOK。
    return NextResponse.redirect(redirectUrl, 308);
  }

  const res = NextResponse.next();

  // 1) /api/session は完全スルー（Cookie 発行/削除に干渉しない）
  if (pathname === "/api/session") return res;

  // 2) 静的ファイル/_next は対象外
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|xml|webp|avif|woff2?)$/i)
  ) {
    return res;
  }

  const isApi = pathname.startsWith("/api");
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

  // 3) Supabase → Cookie の順に role 判定
  let supaRole: "student" | "hospital" | undefined;
  try {
    const supabase = createMiddlewareClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    supaRole = session?.user?.user_metadata?.role as "student" | "hospital" | undefined;
  } catch {
    // swallow
  }
  const cookieRole = req.cookies.get("role")?.value as "student" | "hospital" | undefined;
  const role = supaRole ?? cookieRole;

  // 4) 未ログインの場合：/login・/signup・一部API以外のすべてのページをブロック
  if (!role) {
    // API は従来どおり基本スルー（RLS や各 route 内の認可に任せる）
    if (!isPublic && !isApi) {
      const u = url.clone();
      u.pathname = "/login";
      // 元いたパスを next パラメータで保持してもOK（必要なら）
      u.searchParams.set("next", pathname);
      return NextResponse.redirect(u);
    }
    return res;
  }

  // 5) ログイン済み：/・/login・/signup を開いたら各ダッシュボードへ
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    const u = url.clone();
    u.pathname = role === "hospital" ? "/hospital/dashboard" : "/student/dashboard";
    return NextResponse.redirect(u);
  }

  // 6) ロール違いのセクションを見ようとしたら自分のダッシュへ
  if (role === "student" && pathname.startsWith("/hospital")) {
    const u = url.clone();
    u.pathname = "/student/dashboard";
    return NextResponse.redirect(u);
  }
  if (role === "hospital" && pathname.startsWith("/student")) {
    const u = url.clone();
    u.pathname = "/hospital/dashboard";
    return NextResponse.redirect(u);
  }

  // 7) それ以外はそのまま通す
  return res;
}

/** 画像/静的・favicon は除外 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};