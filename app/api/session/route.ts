export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// POST: { role: "student" | "hospital", email?: string }
export async function POST(req: Request) {
  try {
    const { role, email } = await req.json();
    if (role !== "student" && role !== "hospital") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("role", role, { httpOnly: true, sameSite: "lax", path: "/" });
    if (email) {
      res.cookies.set("email", email, { httpOnly: true, sameSite: "lax", path: "/" });
    }
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

// DELETE: ログアウト
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("role", "", { path: "/", expires: new Date(0) });
  res.cookies.set("email", "", { path: "/", expires: new Date(0) });
  return res;
}

// GET: 動作確認
export async function GET() {
  return NextResponse.json({ ok: true });
}