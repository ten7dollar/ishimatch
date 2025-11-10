// app/api/onboard/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service Role Admin クライアント（envはVercel/ローカルともに設定済み前提）
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const admin = createSupabaseAdmin();

  try {
    const { userId, role, email, name } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
    }

    // 1) 個人DB行の作成 / 更新
    if (role === 'student') {
      const { error } = await admin
        .from('students')
        .upsert([{ id: userId, email: email ?? null, name: name ?? null }]);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from('hospital_accounts')
        .upsert([{ id: userId, email: email ?? null, contact_name: name ?? null }]);
      if (error) throw error;
    }

    // 2) Auth Users の metadata を Service Role で更新（Display name 表示用に full_name も保存）
    const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { role, name: name ?? null, full_name: name ?? null },
    });
    if (metaErr) throw metaErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    // 本番でもわかるように stage だけ簡潔に返す（必要なら message も返す）
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown' },
      { status: 500 }
    );
  }
}