export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const admin = createSupabaseAdmin();
    // 何でも良いので読み取りだけテスト（RLSに関係なく読める＝ServiceRoleが効いている）
    const { data, error } = await admin.from('students').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, sample: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}