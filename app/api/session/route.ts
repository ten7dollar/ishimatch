export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/** Cookie の domain を推定（localhost/127.0.0.1 は undefined でセット） */
function cookieDomain(url: string): string | undefined {
  const h = new URL(url).hostname;
  if (h === "localhost" || h === "127.0.0.1") return undefined;
  return h; // 例: ishimatch.vercel.app
}

const ONE_WEEK = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  try {
    const { role, email } = await req.json();
    if (role !== "student" && role !== "hospital") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    const isProd = process.env.NODE_ENV === "production";
    const domain = cookieDomain(req.url);

    // Cookie 共通のベース（セキュア設定）
    const base = {
      sameSite: "lax" as const,
      secure: isProd,         // 本番は必ず secure
      path: "/",
      domain,                 // localhost では undefined のまま
      maxAge: ONE_WEEK,
    };

    // role は JS から不要 → httpOnly = true
    res.cookies.set("role", role, {
      ...base,
      httpOnly: true,
    });

    // email はフォールバック描画で利用するため JS から読めるようにする
    if (email) {
      res.cookies.set("email", email, {
        ...base,
        httpOnly: false, // ← document.cookie で読めるように（UserProfileProvider のフォールバックで使用）
      });
    }

    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

// DELETE: ログアウト（同じ属性で「過去日時」にして確実に消す）
export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });

  const isProd = process.env.NODE_ENV === "production";
  const domain = cookieDomain(req.url);
  const expired = {
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    domain,
    expires: new Date(0),
  };

  res.cookies.set("role", "", { ...expired, httpOnly: true });
  res.cookies.set("email", "", { ...expired, httpOnly: false });

  return res;
}

// GET: ヘルスチェック
export async function GET() {
  return NextResponse.json({ ok: true });
}