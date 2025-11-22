export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

/**
 * GET /api/documents/download?id=＜student_documents.id＞
 *
 * - 認可: 本人 or 病院ログイン のみ
 * - 動作: documents バケットの private ファイルに対して署名付きURLを発行し 302 でリダイレクト
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    // Cookie（/api/session が入れた role/email と Supabase の auth cookie）をヘッダから解析
    const cookieHeader = req.headers.get("cookie") || "";
    const { role, userId } = readSupabaseUserFromCookie(cookieHeader);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    // 対象ドキュメントを取得
    const { data: doc, error: docErr } = await admin
      .from("student_documents")
      .select("id, student_id, path, file_name, mime_type")
      .eq("id", id)
      .maybeSingle();

    if (docErr || !doc) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 認可チェック: 本人 or 病院
    const allowed = role === "hospital" || userId === doc.student_id;
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 署名付き URL （短期）を発行
    const { data: signed, error: signErr } = await admin
      .storage
      .from("documents")
      .createSignedUrl(doc.path, 60 * 5); // 5分

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: signErr?.message || "sign failed" }, { status: 500 });
    }

    // ファイルに 302 でリダイレクト
    return NextResponse.redirect(signed.signedUrl);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 },
    );
  }
}