import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // Node ランタイムに固定

/**
 * Health: 環境変数が読めるか＋DBに到達できるか（軽いselectでチェック）
 * ※ 認証セッションは見ない（cookie依存を避ける）
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const hasEnv = !!url && !!anon;

    // envが無いなら即エラー
    if (!hasEnv) {
      return NextResponse.json({ ok: false, hasEnv, error: "missing env" }, { status: 500 });
    }

    // 純粋な supabase-js クライアント（セッション持たない）
    const sb = createClient(url, anon, { auth: { persistSession: false } });

    // 軽い疎通テスト（hospitals が public read でなくても OKにしたいならコメントアウト可）
    // ここでテーブルに到達できれば ok:true とする
    let error: string | null = null;
    try {
      const { error: e } = await sb
        .from("hospitals")
        .select("id", { head: true, count: "exact" }); // head:true で件数だけ
      if (e) error = e.message;
    } catch (e: any) {
      error = e?.message ?? "query failed";
    }

    return NextResponse.json({ ok: !error, hasEnv, error });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}