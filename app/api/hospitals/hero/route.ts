// app/api/hospitals/hero/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

const HOSPITAL_ASSETS_BUCKET = "hospital_assets";
const HOSPITAL_HERO_FALLBACK_BUCKET = "hospital_hero_fallback"; // ★ 追加

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
      .eq("hospital_id", hospitalId) // ← hospital_accounts.hospital_id = hospitals.id の前提
      .maybeSingle();

    if (error) {
      console.error("[api/hospitals/hero] select error", error);
      return NextResponse.json(
        { error: "failed to fetch hero_image_path", url: null, isPublished: true },
        { status: 500 }
      );
    }

    const row =
      (data as { hero_image_path: string | null; is_published: boolean | null } | null) ??
      {
        hero_image_path: null,
        is_published: null,
      };

    const heroPath = row.hero_image_path;
    const isPublished = row.is_published ?? true; // null は公開扱い

    // 2) まず従来通り hospital_assets（病院自身が設定した画像）を優先
    if (heroPath) {
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
    }

    // 3) hero_image_path が無い → フォールバックバケットから {hospitalId}.png を探す
    try {
      const { data: fbSigned, error: fbErr } = await supabase.storage
        .from(HOSPITAL_HERO_FALLBACK_BUCKET)
        .createSignedUrl(`${hospitalId}.png`, 600); // 有効期限 10分

      if (!fbErr && fbSigned?.signedUrl) {
        // フォールバック画像があればそれを返す
        return NextResponse.json(
          { url: fbSigned.signedUrl, isPublished },
          { status: 200 }
        );
      }
    } catch (fbErr) {
      console.error("[api/hospitals/hero] fallback createSignedUrl error", fbErr);
      // フォールバック失敗しても致命的ではないのでそのまま続行
    }

    // 4) 画像未設定 or フォールバックも無し → URLはnullで返す（フロントでデフォルト画像）
    return NextResponse.json({ url: null, isPublished }, { status: 200 });
  } catch (e: any) {
    console.error("[api/hospitals/hero] unexpected error", e?.message);
    return NextResponse.json(
      { error: "unexpected error", url: null, isPublished: true },
      { status: 500 }
    );
  }
}