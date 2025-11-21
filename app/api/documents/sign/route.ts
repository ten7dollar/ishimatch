// app/api/documents/sign/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdmin,
  readSupabaseUserFromCookie,
} from "@/app/lib/supabase/admin";

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

    const admin = createSupabaseAdmin();

    // Cookie から role / email / (userId) を読む
    const { role, email, userId } = readSupabaseUserFromCookie(
      req.headers.get("cookie")
    );
    if (!role && !email && !userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // アクセス権：本人 or 病院ログイン（病院はメール一致で判定）
    let allowed = false;

    // もし userId を Cookie に入れているなら本人判定
    if (userId && userId === studentId) allowed = true;

    // 病院ログイン（role: hospital）なら、email 一致で病院アカウントを確認
    if (!allowed && role === "hospital" && email) {
      const { data: hosp, error } = await admin
        .from("hospital_accounts")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!error && hosp) allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // パスの安全性チェック
    if (!path.startsWith(`${studentId}/`)) {
      return NextResponse.json(
        { ok: false, error: "invalid path (must start with {studentId}/)" },
        { status: 400 }
      );
    }
    if (path.includes("..")) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }
    if (!/^[-_/.\w]+$/.test(path)) {
      return NextResponse.json(
        { ok: false, error: "invalid characters in path" },
        { status: 400 }
      );
    }

    // 署名付きURLを発行（5分）
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(path, 60 * 5);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}