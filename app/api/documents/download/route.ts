// app/api/documents/download/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

// Database 型を使っている場合は以下をプロジェクトの型に合わせて import してください
// import type { Database } from "@/app/lib/supabase/types";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    // 1) Supabase セッション (sb-xxx) で利用者を判定（カスタム Cookie は使わない）
    const supabase = createRouteHandlerClient/* <Database> */({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2) 対象ドキュメント取得
    const admin = createSupabaseAdmin();
    const { data: doc, error: docErr } = await admin
      .from("student_documents")
      .select("id, student_id, path")
      .eq("id", id)
      .maybeSingle();

    if (docErr) {
      return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 });
    }
    if (!doc) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 3) アクセス許可: 本人 or 病院ログイン
    let allowed = doc.student_id === userId;
    if (!allowed) {
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

    // 4) 署名付きURL を 5 分で発行 → 302 でそのまま遷移
    const { data: signed, error: signErr } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.path, 60 * 5);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: signErr?.message || "failed to sign url" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}