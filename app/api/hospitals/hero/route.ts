// app/api/hospitals/hero/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

const HOSPITAL_ASSETS_BUCKET = "hospital_assets";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId");

  if (!hospitalId) {
    return NextResponse.json({ error: "hospitalId is required" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  try {
    // 1) hospital_accounts から hero_image_path を取得（Service RoleなのでRLSの制限なし）
    const { data, error } = await supabase
      .from("hospital_accounts")
      .select("hero_image_path")
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (error) {
      console.error("[api/hospitals/hero] select error", error);
      return NextResponse.json(
        { error: "failed to fetch hero_image_path" },
        { status: 500 }
      );
    }

    const heroPath = (data as { hero_image_path: string | null } | null)?.hero_image_path;
    if (!heroPath) {
      // 画像未設定 → フロント側でデフォルト画像を使ってもらう
      return NextResponse.json({ url: null }, { status: 200 });
    }

    // 2) Storage から署名付きURLを生成
    const { data: signed, error: signErr } = await supabase.storage
      .from(HOSPITAL_ASSETS_BUCKET)
      .createSignedUrl(heroPath, 600); // 有効期限 10分

    if (signErr) {
      console.error("[api/hospitals/hero] createSignedUrl error", signErr);
      return NextResponse.json(
        { error: "failed to create signed url" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signed?.signedUrl ?? null }, { status: 200 });
  } catch (e: any) {
    console.error("[api/hospitals/hero] unexpected error", e?.message);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}