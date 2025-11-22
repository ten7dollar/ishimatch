// app/api/documents/view-url/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { studentId?: string; path?: string };
    const studentId = body?.studentId?.trim();
    const path = body?.path?.trim();

    if (!studentId || !path) {
      return NextResponse.json({ ok: false, error: "studentId and path are required" }, { status: 400 });
    }

    const { role, userId } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 本人 or 病院なら許可
    const allowed = role === "hospital" || userId === studentId;
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 安全性チェック
    if (!path.startsWith(`${studentId}/`)) {
      return NextResponse.json({ ok: false, error: "invalid path (must start with {studentId}/)" }, { status: 400 });
    }
    if (path.includes("..") || !/^[-_/.\w\u3040-\u30ff\u4e00-\u9faf]+$/.test(path)) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: error?.message || "failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}