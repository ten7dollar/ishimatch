export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(
    JSON.stringify({
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      sr: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}