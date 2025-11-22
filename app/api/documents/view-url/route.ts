export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdmin,
  readSupabaseUserFromCookie,
} from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/view-url
 * Body or Query: { studentId: string; path: string }
 *  - 本人(学生) or 病院ログインのみ許可
 *  - documents の private ファイルの署名付きURL（5分）を返す
 */
export async function POST(req: NextRequest) {
  try {
    // ----- ① 入力をどこからでも拾えるように -----
    let json: any = null;
    try {
      json = await req.json();
    } catch {
      // body が空のパターンを許容（Query や Header をフォールバック）
    }

    const url = new URL(req.url);
    const studentId =
      (json?.studentId ?? url.searchParams.get("studentId") ?? req.headers.get("x-student-id") ?? "")
        .toString()
        .trim();
    const path =
      (json?.path ?? url.searchParams.get("path") ?? req.headers.get("x-path") ?? "")
        .toString()
        .trim();

    if (!studentId || !path) {
      return NextResponse.json(
        { ok: false, error: "studentId and path are required" },
        { status: 400 }
      );
    }

    // ----- ② Cookie を検証して認可 -----
    // /api/session が付与した role/email と、Supabase の sb-***-access-token をどちらも見る
    const { role, userId } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const allowed = role === "hospital" || userId === studentId;
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // ----- ③ パスの安全性チェック（Dir トラバーサル等を阻止）-----
    if (!path.startsWith(`${studentId}/`)) {
      return NextResponse.json(
        { ok: false, error: "invalid path (must start with {studentId}/)" },
        { status: 400 }
      );
    }
    if (path.includes("..") || !/^[-_/.\w\u3040-\u30ff\u4e00-\u9faf]+$/.test(path)) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }

    // ----- ④ 署名付きURLを発行（5分）-----
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      // Storage 側で404のときでも error が空のケースに備え 404 を返す
      return NextResponse.json(
        { ok: false, error: error?.message || "object not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    // 500 を握りつぶさず詳細を返す
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}