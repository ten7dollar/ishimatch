import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { session }, error } = await supabase.auth.getSession();
  return NextResponse.json({
    ok: !error,
    hasEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    session: !!session,
    error: error?.message ?? null,
  });
}