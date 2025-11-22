// app/api/documents/upload-url/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/upload-url
 * Body: { studentId: string; kind: "transcript" | "certificate"; filename: string }
 *
 * 役割:
 *  - documents バケットに対する「署名付きアップロードURL」を発行（本人のみ）
 *  - クライアントは返ってきた signedUrl に対して PUT する
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      studentId?: string;
      kind?: "transcript" | "certificate";
      filename?: string;
    };

    const studentId = body?.studentId?.trim();
    const kind = body?.kind;
    const filename = (body?.filename ?? "").trim();

    if (!studentId || !kind || !filename) {
      return NextResponse.json(
        { ok: false, error: "studentId, kind and filename are required" },
        { status: 400 }
      );
    }

    // Cookie から本人確認（学生自身のみ発行可能）
    const { userId } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");
    if (!userId || userId !== studentId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // ファイル名の簡易サニタイズ
    const safeName = filename.replace(/[^-\w.@\s]/g, "_");
    const path = `${studentId}/${Date.now()}_${safeName}`;

    const admin = createSupabaseAdmin();

    // 署名付きアップロードURLを発行（有効期限: デフォルト 2分）
    const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(path);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // data: { signedUrl, token }
    return NextResponse.json(
      { ok: true, signedUrl: data?.signedUrl ?? "", token: data?.token ?? "", path },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}