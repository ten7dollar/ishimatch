import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs"; // Node ランタイムに固定（Edgeの差異回避）

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() }); // ★ ラッパー関数に
    const { data: { session }, error } = await supabase.auth.getSession();

    return NextResponse.json({
      ok: !error,
      hasEnv:
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      session: !!session,
      error: error?.message ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}