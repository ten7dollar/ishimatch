// app/api/documents/view-url/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/view-url
 * Body: { studentId: string; path: string }
 * 役割:
 *  - documents バケットの private ファイルの署名付きURL（5分）を返す
 * 認可:
 *  - 病院ログイン（role === "hospital"）なら誰のファイルでも可
 *  - 学生ログインは本人（userId === studentId）のみ可
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

    // Cookie から role / userId を読む
    const { role, userId } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");

    // ✅ 認可: 病院は role だけでOK（userId不要）/ 学生は本人のみ
    const isHospital = role === "hospital";
    const isStudentSelf = !!userId && userId === studentId;

    if (!(isHospital || isStudentSelf)) {
      // role がない or 学生だが本人ではない
      // 病院ログインで role は見えているが userId は無い（=想定通り）場合はここを通らない
      const status = role ? 403 : 401;
      return NextResponse.json({ ok: false, error: status === 401 ? "unauthorized" : "forbidden" }, { status });
    }

    // パスの安全性
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
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(path, 60 * 5); // 5分有効

    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: error?.message || "failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}