// app/api/documents/view-url/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

/**
 * POST /api/documents/view-url
 * Body: { id: string }  // student_documents.id
 *  - サーバ側で student_documents を参照し、所有者チェック（本人 or 病院）をしてから
 *    Storage "documents" の署名付きURL(5分)を返す
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: string };
    const id = body?.id?.trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    // Cookie（role / email は /api/session、Auth の sb-*** は Supabase が設定）
    // Next.js 15 以降は cookies() が Promise になるため await が必要
    const jar = await cookies();
    const role = jar.get("role")?.value ?? "";
    const sbAccess = jar.get("sb-access-token")?.value; // Supabase Auth cookie（名前は環境で若干変わります）

    if (!sbAccess) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    // 1) 該当ドキュメントを DB から取得
    const { data: doc, error: docErr } = await admin
      .from("student_documents")
      .select("id, student_id, path, file_name")
      .eq("id", id)
      .maybeSingle();

    if (docErr) {
      console.error("[view-url] select error:", docErr.message);
      return NextResponse.json({ ok: false, error: "select failed" }, { status: 500 });
    }
    if (!doc) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 2) 本人 or 病院であることをサーバ側で判断
    const isHospital = role === "hospital";
    // cookie から userId を直接読まず、Auth の JWT を使って admin 側で検証してもOK
    // MVP では role === hospital を優先
    if (!isHospital) {
      // 本人確認（Auth のユーザーIDを得る）
      const { data: me } = await admin.auth.getUser(sbAccess);
      const myId = me?.user?.id;
      if (!myId || myId !== doc.student_id) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    // 3) 署名付きURLを発行（Storage バケットは "documents"）
    //    ※ path は DB に保存してある安全な値を使う
    const { data: signed, error: sErr } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.path, 60 * 5); // 5分

    if (sErr || !signed?.signedUrl) {
      console.error("[view-url] signed url error:", sErr?.message);
      return NextResponse.json({ ok: false, error: "object not found" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: signed.signedUrl }, { status: 200 });
  } catch (e: any) {
    console.error("[view-url] unexpected:", e?.message ?? e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}