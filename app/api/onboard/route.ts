export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/app/lib/supabase/admin';

export async function POST(req: Request) {
  const admin = createSupabaseAdmin();
  try {
    const { userId, role, email, name } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
    }

    if (role === 'student') {
      const { error } = await admin.from('students').upsert({
        id: userId,
        email: email ?? null,
        name:  name ?? null
      });
      if (error) throw error;
    } else {
      const { error } = await admin.from('hospital_accounts').upsert({
        id: userId,
        email: email ?? null,
        contact_name: name ?? null
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[onboard] error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}