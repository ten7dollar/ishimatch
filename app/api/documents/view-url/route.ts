// app/api/documents/view-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 環境変数（Next.js で .env に設定している値）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 病院ログイン（role= "hospital"）であれば、student_documents の
 * {studentId}/... 直下のファイルに対して 1 分間有効な署名 URL を発行します。
 * ※ 学生本人の検証は行いません（要件：「病院は閲覧可」） 
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { studentId, path } = (await req.json()) as {
      studentId?: string;
      path?: string;
    };

    if (!studentId || !path || typeof studentId !== 'string' || typeof path !== 'string') {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    // path の簡易バリデーション（studentId 配下のみ・ディレクトリトラバーサルを禁止）
    if (!path.startsWith(`${studentId}/`) || path.includes('..')) {
      return NextResponse.json({ ok: false, error: 'invalid_path' }, { status: 400 });
    }

    // Browser から送られてくる role Cookie をシンプルにチェック
    const role = req.cookies.get('role')?.value;
    if (role !== 'hospital') {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // service_role でサイン（閲覧専用に1分間だけ有効）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .storage
      .from('student_documents')
      .createSignedUrl(path, 60); // 60秒有効（必要に応じて延長可）

    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: error?.message ?? 'sign_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl }, { status: 200 });
  } catch (e: any) {
    console.error('[view-url] error', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}