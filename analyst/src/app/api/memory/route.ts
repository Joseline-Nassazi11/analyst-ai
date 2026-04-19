import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ memories: [], ok: false });
  if (!user) return Response.json({ memories: [] });
  const admin = createAdminClient();
  const { data } = await admin.from('user_memory').select('content, type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  return Response.json({ memories: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ memories: [], ok: false });
  const { content, type } = await req.json();
  if (!user) return Response.json({ ok: false });
  const admin = createAdminClient();
  await admin.from('user_memory').insert({ user_id: user.id, content, type: type ?? 'insight' });
  return Response.json({ ok: true });
}