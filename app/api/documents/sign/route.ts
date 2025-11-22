// app/api/documents/sign/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/sign
 * Body: { studentId: string; path: string }
 *
 * 役割:
 *  - documents バケットの private ファイルを短期閲覧するための署名付きURLを発行
 *  - 権限: 本人 or 病院ログイン で許可（MVP）
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

    const { userId } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    // 本人 or 病院ログインを許可
    let allowed = false;
    if (userId === studentId) {
      allowed = true;
    } else {
      const { data: hosp } = await admin
        .from("hospital_accounts")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (hosp) allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // パスの安全性確認
    if (!path.startsWith(`${studentId}/`) || path.includes("..") || !/^[-_/.\w]+$/.test(path)) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }

    // 署名付きURL（閲覧）を 5 分で発行
    const { data, error } = await admin.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data?.signedUrl ?? "" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}