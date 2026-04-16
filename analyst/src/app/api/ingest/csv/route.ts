import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');
  if (!documentId) return Response.json({ error: 'Missing documentId' }, { status: 400 });

  const admin = createAdminClient();

  // Verify document belongs to user
  const { data: doc } = await admin
    .from('documents')
    .select('id, name, type')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

  // Get all chunks and reconstruct content
  const { data: chunks } = await admin
    .from('document_chunks')
    .select('content, chunk_index')
    .eq('document_id', documentId)
    .eq('user_id', user.id)
    .order('chunk_index');

  if (!chunks || chunks.length === 0) {
    return Response.json({ error: 'No content found' }, { status: 404 });
  }

  const content = chunks.map(c => c.content).join('\n');
  return Response.json({ content, name: doc.name });
}