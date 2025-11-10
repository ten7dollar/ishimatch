export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    await supabase.auth.signOut(); // ← サーバ側でsbクッキーを削除
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/signout] error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}