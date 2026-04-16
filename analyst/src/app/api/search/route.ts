import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';
import { embed } from 'ai';
import { getEmbeddingModel } from '@/lib/ai/providers';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { documentIds, topic } = await req.json();
  if (!documentIds?.length || !topic) {
    return Response.json({ error: 'documentIds and topic required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { embedding } = await embed({ model: getEmbeddingModel(), value: topic });

  const results = await Promise.all(
    documentIds.map(async (docId: string) => {
      const { data: doc } = await admin
        .from('documents')
        .select('name')
        .eq('id', docId)
        .eq('user_id', user.id)
        .single();

      const { data: chunks } = await admin.rpc('match_document_chunks', {
        query_embedding: embedding,
        match_threshold: 0.2,
        match_count: 3,
        filter_user_id: user.id,
      });

      const filtered = (chunks ?? []).filter((c: { document_id: string }) => c.document_id === docId);

      return {
        documentId: docId,
        documentName: doc?.name ?? 'Unknown',
        passages: filtered.map((c: { content: string; similarity: number }) => ({
          content: c.content,
          similarity: c.similarity,
        })),
      };
    })
  );

  return Response.json({ topic, documents: results });
}
