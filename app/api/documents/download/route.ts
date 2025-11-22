// app/api/documents/download/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdmin,
  readSupabaseUserFromCookie,
} from "@/app/lib/supabase/admin";

/**
 * GET /api/documents/download?id=<student_documents.id>
 * 病院 or 本人（学生）だけが、documents バケットの private ファイルを閲覧/ダウンロードできる。
 * - レスポンスはファイルバイナリ（サーバが直接 Storage から取得して返す）
 * - フロントは <a href="/api/documents/download?id=..."> 表示 </a> で OK
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // 1) 対象ドキュメント取得
    const { data: doc, error: docErr } = await admin
      .from("student_documents")
      .select("id, student_id, path, file_name, mime_type")
      .eq("id", id)
      .maybeSingle();

    if (docErr) {
      return NextResponse.json(
        { ok: false, error: docErr.message },
        { status: 500 }
      );
    }
    if (!doc) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 2) 認可（本人 or 病院）
    const { role, userId } = readSupabaseUserFromCookie(
      req.headers.get("cookie") || ""
    );
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const allowed = role === "hospital" || userId === doc.student_id;
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 3) Storage から直接ダウンロードして、そのまま返す
    const { data: file, error: dlErr } = await admin.storage
      .from("documents")
      .download(doc.path);

    if (dlErr || !file) {
      return NextResponse.json(
        { ok: false, error: dlErr?.message || "download failed" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileName = doc.file_name || "document";
    const mime = doc.mime_type || "application/octet-stream";

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        // inline: ブラウザ内表示 / attachment: 強制ダウンロード
        "Content-Disposition":
          `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}