import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const admin = createAdminClient();

  if (sessionId) {
    const { data: messages } = await admin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    return Response.json({ messages: messages ?? [] });
  }

  const { data: sessions } = await admin
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);
  return Response.json({ sessions: sessions ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, modelId, temperature } = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      title: title ?? 'New Research Session',
      model_id: modelId ?? 'gpt-4o-mini',
      temperature: temperature ?? 0.7,
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data });
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { sessionId, title, messageId, feedback } = body;
  const admin = createAdminClient();

  // Handle feedback update
  if (messageId && feedback !== undefined) {
    await admin.from('chat_messages').update({ feedback }).eq('id', messageId).eq('user_id', user.id);
    return Response.json({ success: true });
  }

  // Handle title update
  if (sessionId && title) {
    await admin.from('chat_sessions').update({ title }).eq('id', sessionId).eq('user_id', user.id);
    return Response.json({ success: true });
  }

  // Handle ping / updated_at refresh
  if (sessionId) {
    await admin.from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user.id);
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 });
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json();
  const admin = createAdminClient();
  await admin.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', user.id);
  return Response.json({ success: true });
}
