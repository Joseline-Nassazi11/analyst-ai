import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';
import { formatCitation, exportCitationsAsText } from '@/lib/utils/citations';
import type { Citation, CitationFormat } from '@/types';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') ?? 'apa') as CitationFormat;
  const exportAll = searchParams.get('export') === 'true';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('citations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const citations = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    title: row.title,
    authors: row.authors,
    url: row.url,
    publicationDate: row.publication_date,
    publisher: row.publisher,
    journalName: row.journal_name,
    volume: row.volume,
    issue: row.issue,
    pages: row.pages,
    doi: row.doi,
    source: row.source,
    documentId: row.document_id,
    createdAt: row.created_at,
  })) as Citation[];

  if (exportAll) {
    const text = exportCitationsAsText(citations, format);
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="citations-${format}.txt"`,
      },
    });
  }

  return Response.json({ citations });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('citations')
    .insert({ ...body, user_id: user.id })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { citationId } = await req.json();
  const admin = createAdminClient();
  await admin.from('citations').delete().eq('id', citationId).eq('user_id', user.id);
  return Response.json({ success: true });
}
