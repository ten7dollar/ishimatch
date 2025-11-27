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
    // 1) hospital_accounts から hero_image_path / is_published を取得
    const { data, error } = await supabase
      .from("hospital_accounts")
      .select("hero_image_path, is_published")
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (error) {
      console.error("[api/hospitals/hero] select error", error);
      return NextResponse.json(
        { error: "failed to fetch hero_image_path", url: null, isPublished: true },
        { status: 500 }
      );
    }

    const row = (data as { hero_image_path: string | null; is_published: boolean | null } | null) ?? {
      hero_image_path: null,
      is_published: null,
    };

    const heroPath = row.hero_image_path;
    const isPublished = row.is_published ?? true; // null は公開扱い

    // 画像未設定 → URLはnullで返す（フロント側でデフォルト画像）
    if (!heroPath) {
      return NextResponse.json({ url: null, isPublished }, { status: 200 });
    }

    // 2) Storage から署名付きURLを生成
    const { data: signed, error: signErr } = await supabase.storage
      .from(HOSPITAL_ASSETS_BUCKET)
      .createSignedUrl(heroPath, 600); // 有効期限 10分

    if (signErr) {
      console.error("[api/hospitals/hero] createSignedUrl error", signErr);
      return NextResponse.json(
        { error: "failed to create signed url", url: null, isPublished },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { url: signed?.signedUrl ?? null, isPublished },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[api/hospitals/hero] unexpected error", e?.message);
    return NextResponse.json(
      { error: "unexpected error", url: null, isPublished: true },
      { status: 500 }
    );
  }
}