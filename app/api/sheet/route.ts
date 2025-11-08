// /app/api/sheet/route.ts
import { NextResponse } from "next/server";

/**
 * スプレッドシート出力API（停止/再開を .env で切替可能）
 * - GAS_WEB_APP_URL が未設定 or SHEET_EXPORT_ENABLED !== "true" の場合は 503
 * - 有効時のみ GAS Webアプリへサーバ側から POST
 */
export async function POST(req: Request) {
  try {
    const enabled = process.env.SHEET_EXPORT_ENABLED === "true"; // ← これでON/OFF
    const url     = process.env.GAS_WEB_APP_URL;
    const token   = process.env.GAS_SECRET_TOKEN || "";

    if (!enabled || !url) {
      return NextResponse.json(
        { ok: false, error: "sheet export disabled" },
        { status: 503 },
      );
    }

    const data = await req.json();

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, data }),
      redirect: "follow",
    });

    // GASの返答をできる限りJSONとして返す
    const text = await res.text();
    try {
      const payload = JSON.parse(text);
      return NextResponse.json(payload, { status: res.status });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON from GAS" },
        { status: 502 },
      );
    }
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? "proxy error" }, { status: 500 });
  }
}