// app/api/documents/view-url/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, readSupabaseUserFromCookie } from "@/app/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

// ★ request の Cookie から supabase のユーザーを確実に取得するヘルパ
async function getAuthUser(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookie = req.headers.get("cookie") || "";
  const supabase = createClient(url, anon, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Cookie: cookie } as any },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { studentId?: string; path?: string };
    const studentId = body?.studentId?.trim();
    const path = body?.path?.trim();

    if (!studentId || !path) {
      return NextResponse.json({ ok: false, error: "studentId and path are required" }, { status: 400 });
    }

    // 1) Supabase Auth（必須）
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) role（/api/session でセット済みクッキー。無ければ student 扱い）
    const { role } = readSupabaseUserFromCookie(req.headers.get("cookie") || "");
    const isHospital = role === "hospital";

    // 3) 本人 or 病院なら許可
    if (!(isHospital || authUser.id === studentId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 4) パスの安全性
    if (!path.startsWith(`${studentId}/`)) {
      return NextResponse.json({ ok: false, error: "invalid path (must start with {studentId}/)" }, { status: 400 });
    }
    if (path.includes("..") || !/^[-_/.\w\u3040-\u30ff\u4e00-\u9faf]+$/.test(path)) {
      return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
    }

    // 5) 署名URL（5分）
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: error?.message || "failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}