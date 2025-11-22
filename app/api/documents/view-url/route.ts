// app/api/documents/view-url/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/view-url
 * Body: { studentId: string; path: string }
 * 病院 or 本人（学生）だけに、documents の private ファイルの署名付きURL（5分）を返す
 *
 * 認可は Cookie で判定:
 *  - role= hospital | student   （/api/session が Set-Cookie している前提）
 *  - Supabase Auth の userId    （auth cookie）
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { studentId?: string; path?: string };
    const studentId = body?.studentId?.trim();
    const path = body?.path?.trim();

    if (!studentId || !path) {
      return NextResponse.json(
        { ok: false, error: "studentId and path are required" },
        { status: 400 }
      );
    }

    // ← ここがポイント：ヘッダーから Cookie を読んで helper で解析
    const cookieHeader = req.headers.get("cookie") || "";
    const { role, userId } = readSupabaseUserFromCookie(cookieHeader);

    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    // 本人 or 病院ログインのみ許可
    if (!(role === "hospital" || userId === studentId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // パス安全性チェック
    if (!path.startsWith(`${studentId}/`)) {
      return NextResponse.json(
        { ok: false, error: "invalid path (must start with {studentId}/)" },
        { status: 400 }
      );
    }
    if (path.includes("..") || !/^[-_/.\w\u3040-\u30ff\u4e00-\u9faf]+$/.test(path)) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // 署名付きURL（5分）
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}