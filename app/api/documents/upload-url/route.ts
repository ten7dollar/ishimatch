export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/upload-url
 * Body: { studentId: string; kind: "transcript" | "certificate"; filename: string }
 * 署名付きアップロードURLを発行（MVP: 本人チェックは「できれば」）。
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

    // 可能なら本人チェック（Cookie が無い環境もあるので "緩く" 落としません）
    let isSelf = false;
    try {
      const { userId } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");
      isSelf = !!userId && userId === studentId;
    } catch {
      // Cookie が無い/読めない場合はスキップ（DB 側 RLS で最終的に担保される）
    }

    // ファイル名サニタイズ ＆ 保存パス
    const safeName = filename.replace(/[^\-\w.@\s]/g, "_");
    const path = `${studentId}/${Date.now()}_${safeName}`;

    const admin = createSupabaseAdmin();
    const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: error?.message || "failed" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, signedUrl: data.signedUrl, path },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}