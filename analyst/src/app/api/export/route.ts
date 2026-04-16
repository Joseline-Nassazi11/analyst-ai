import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';
import { generateDocx } from '@/lib/utils/docx';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get('id');

  const admin = createAdminClient();

  if (reportId) {
    // Download a single report as DOCX
    const { data: report } = await admin
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single();

    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    const buffer = await generateDocx(report.title, report.content, user.email);
    const filename = `${report.title.replace(/[^a-z0-9]/gi, '_')}.docx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // List all reports
  const { data, error } = await admin
    .from('reports')
    .select('id, title, format, created_at, session_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ reports: data });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, sessionId } = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('reports')
    .insert({ user_id: user.id, session_id: sessionId ?? null, title, content, format: 'docx' })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { reportId } = await req.json();
  const admin = createAdminClient();
  await admin.from('reports').delete().eq('id', reportId).eq('user_id', user.id);
  return Response.json({ success: true });
}
