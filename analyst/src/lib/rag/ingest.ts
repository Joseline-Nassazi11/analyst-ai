import { embed } from 'ai';
import { getEmbeddingModel } from '@/lib/ai/providers';
import { createAdminClient } from '@/lib/db/supabase';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function chunkText(text: string): string[] {
  // Normalize whitespace and remove null bytes
  const cleaned = text.replace(/\0/g, '').replace(/\r\n/g, '\n').trim();
  if (!cleaned || cleaned.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();

    if (chunk.length > 30) {
      chunks.push(chunk);
    }

    // Prevent infinite loop
    const advance = Math.max(CHUNK_SIZE - CHUNK_OVERLAP, 1);
    start += advance;

    // Safety limit
    if (chunks.length > 2000) break;
  }

  return chunks;
}

export async function parseFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8');
  }

  if (ext === 'csv') {
    return buffer.toString('utf-8');
  }

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text ?? '';
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? '';
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

export async function ingestDocument(
  documentId: string,
  userId: string,
  text: string
): Promise<number> {
  const supabase = createAdminClient();
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error('No text content could be extracted from this document.');
  }

  const BATCH_SIZE = 10;
  const allRows: {
    document_id: string;
    user_id: string;
    content: string;
    chunk_index: number;
    embedding: number[];
  }[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const embedResults = await Promise.all(
      batch.map(chunk =>
        embed({ model: getEmbeddingModel(), value: chunk.slice(0, 8000) })
      )
    );

    batch.forEach((content, j) => {
      allRows.push({
        document_id: documentId,
        user_id: userId,
        content,
        chunk_index: i + j,
        embedding: embedResults[j].embedding,
      });
    });
  }

  const { error } = await supabase.from('document_chunks').insert(allRows);
  if (error) throw new Error(`Failed to insert chunks: ${error.message}`);

  await supabase
    .from('documents')
    .update({ status: 'ready', chunk_count: chunks.length })
    .eq('id', documentId);

  return chunks.length;
}

export async function semanticSearch(
  query: string,
  userId: string,
  limit = 5,
  threshold = 0.3
) {
  const supabase = createAdminClient();
  const { embedding } = await embed({ model: getEmbeddingModel(), value: query });

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_user_id: userId,
  });

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data ?? [];
}
