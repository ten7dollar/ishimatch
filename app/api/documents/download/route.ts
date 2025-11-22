// app/api/documents/download/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

// /api/documents/download?id=<student_documents.id>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // 1) DB から該当レコードを取得
    const { data: doc, error: docErr } = await admin
      .from("student_documents")
      .select("id, student_id, path")
      .eq("id", id)
      .maybeSingle();

    if (docErr) {
      return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 });
    }
    if (!doc) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 2) 署名付きURL（60秒）を発行
    const { data: signed, error: signErr } = await admin
      .storage
      .from("documents")
      .createSignedUrl(doc.path, 60);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: signErr?.message || "sign failed" }, { status: 500 });
    }

    // 3) 署名URLにリダイレクト
    return NextResponse.redirect(signed.signedUrl, { status: 303 });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}