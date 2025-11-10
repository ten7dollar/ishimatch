export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createSupabaseAdmin();
  try {
    const { userId, role, email, name } = await req.json();
    console.log("[onboard] payload", { userId, role, email, name });

    if (!userId || !role) {
      return NextResponse.json({ ok:false, error:"bad request" }, { status:400 });
    }

    let row: any = null;

    if (role === "student") {
      const { data, error } = await admin
        .from("students")
        .upsert([{ id: userId, email: email ?? null, name: name ?? null }])
        .select("*");
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await admin
        .from("hospital_accounts")
        .upsert([{ id: userId, email: email ?? null, contact_name: name ?? null }])
        .select("*");
      if (error) throw error;
      row = data;
    }

    return NextResponse.json({ ok:true, row }, { status:200 });
  } catch (e: any) {
    console.error("[onboard] error", e);
    return NextResponse.json({ ok:false, error: e?.message ?? "unknown" }, { status:500 });
  }
}