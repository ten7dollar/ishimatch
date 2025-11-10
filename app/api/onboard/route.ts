export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Service Role Admin クライアントをここで直に作成（相対での import 問題を回避）
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const admin = createSupabaseAdmin();
  try {
    const { userId, role, email, name } = await req.json();
    console.log('[onboard] payload', { userId, role, email, name });

    if (!userId || !role) {
      return NextResponse.json({ ok:false, error:'bad request (missing userId/role)' }, { status:400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok:false, error:'service role key not loaded' }, { status:500 });
    }

    let res: any = null;

    if (role === 'student') {
      const { data, error } = await admin
        .from('students')
        .upsert([{ id: userId, email: email ?? null, name: name ?? null }])
        .select('*');                       // 挿入された行を返す（デバッグ可視化用）
      if (error) throw error;
      res = data;
    } else {
      const { data, error } = await admin
        .from('hospital_accounts')
        .upsert([{ id: userId, email: email ?? null, contact_name: name ?? null }])
        .select('*');
      if (error) throw error;
      res = data;
    }

    return NextResponse.json({ ok:true, row:res }, { status:200 });
  } catch (e: any) {
    console.error('[onboard] error', e);
    return NextResponse.json({ ok:false, error: e?.message ?? 'unknown' }, { status:500 });
  }
}