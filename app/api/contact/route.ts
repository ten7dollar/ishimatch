// app/api/contact/route.ts
import { NextResponse } from "next/server";

/** GET: 設定確認（/api/contact をブラウザで開くと状態が分かる） */
export async function GET() {
  const ok = !!process.env.RESEND_API_KEY && !!process.env.CONTACT_TO;
  return NextResponse.json({
    ok,
    hasApiKey: !!process.env.RESEND_API_KEY,
    hasTo: !!process.env.CONTACT_TO,
  });
}

/** POST: お問い合わせ送信（body: { name, email, category, message }） */
export async function POST(req: Request) {
  try {
    const { name, email, category, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "missing fields" },
        { status: 400 },
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.CONTACT_TO;

    if (!RESEND_API_KEY || !TO) {
      return NextResponse.json(
        { ok: false, error: "server not configured" },
        { status: 500 },
      );
    }

    // Resend 経由で送信
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IshiMatch Contact <onboarding@resend.dev>", // Resend テスト送信元
        to: [TO],                                          // 宛先（.env）
        reply_to: email,                                   // 返信先に問い合わせ本人
        subject: `【医志マッチ】お問い合わせ: ${category || "未分類"}`,
        text: `お名前: ${name}\nメール: ${email}\nカテゴリ: ${category}\n\n${message}`,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ ok: false, error: text }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown" },
      { status: 500 },
    );
  }
}