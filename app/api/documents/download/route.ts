// app/api/documents/download/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const docId = url.searchParams.get("id");
    if (!docId) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    // 1) ルートハンドラ用の Supabase（セッションは Cookie から自動で適用）
    const sb = createRouteHandlerClient({ cookies });

    // RLS で保護されたままメタデータ取得（未ログイン/権限なしならここで 401/404）
    const { data: doc, error: selErr, status } = await sb
      .from("student_documents")
      .select("student_id, path")
      .eq("id", docId)
      .maybeSingle();

    if (selErr || !doc) {
      return NextResponse.json(
        { ok: false, error: selErr?.message || "not found" },
        { status: status || 404 }
      );
    }

    // 2) 路径の健全性（念のため）
    const { student_id, path } = doc as { student_id: string; path: string };
    if (!path.startsWith(`${student_id}/`) || path.includes("..")) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }

    // 3) Admin で署名 URL を発行（5分）
    const admin = createSupabaseAdmin();
    const { data: signed, error: sErr } = await admin
      .storage
      .from("documents")
      .createSignedUrl(path, 60 * 5);

    if (sErr || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: sErr?.message || "sign failed" }, { status: 500 });
    }

    // 4) 署名 URL へリダイレクト（ブラウザが直接 PDF/画像を開く）
    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}