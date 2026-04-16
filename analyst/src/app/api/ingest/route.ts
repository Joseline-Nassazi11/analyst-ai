import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';
import { parseFile, ingestDocument } from '@/lib/rag/ingest';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const documents = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    size: row.size,
    storagePath: row.storage_path,
    chunkCount: row.chunk_count,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    metadata: row.metadata,
  }));

  return Response.json({ documents });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  if (!files.length) {
    return Response.json({ error: 'No files provided' }, { status: 400 });
  }

  const admin = createAdminClient();
  const results = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['pdf', 'txt', 'md', 'csv', 'docx'];

    if (!allowedTypes.includes(ext ?? '')) {
      results.push({ name: file.name, status: 'error', error: `Unsupported file type .${ext}` });
      continue;
    }

    // Create document record
    const { data: doc, error: insertError } = await admin
      .from('documents')
      .insert({
        user_id: user.id,
        name: file.name,
        type: ext,
        size: file.size,
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError || !doc) {
      results.push({ name: file.name, status: 'error', error: 'Database error' });
      continue;
    }

    try {
      // Upload raw file to Supabase Storage
      const fileBuffer = await file.arrayBuffer();
      const storagePath = `${user.id}/${doc.id}/${file.name}`;
      await admin.storage
        .from('analyst-ai')
        .upload(storagePath, fileBuffer, { contentType: file.type });

      await admin.from('documents').update({ storage_path: storagePath }).eq('id', doc.id);

      // Parse & ingest
      const text = await parseFile(file);
      const chunkCount = await ingestDocument(doc.id, user.id, text);

      results.push({ name: file.name, status: 'ready', documentId: doc.id, chunkCount });
    } catch (err) {
      await admin
        .from('documents')
        .update({ status: 'error', error_message: String(err) })
        .eq('id', doc.id);

      results.push({ name: file.name, status: 'error', error: String(err) });
    }
  }

  return Response.json({ results });
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { documentId } = await req.json();
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (doc?.storage_path) {
    await admin.storage.from('analyst-ai').remove([doc.storage_path]);
  }

  await admin.from('documents').delete().eq('id', documentId).eq('user_id', user.id);
  return Response.json({ success: true });
}
