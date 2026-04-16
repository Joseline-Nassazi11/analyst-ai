import { tool } from 'ai';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase';
import { embed } from 'ai';
import { getEmbeddingModel } from './providers';
import type { DocumentSource, WebSource } from '@/types';
import { log, createTimer, getDynamicK } from '@/lib/logger';

export const ragSearchTool = (userId: string, sessionId?: string) =>
  tool({
    description: "Search the user's uploaded documents using semantic similarity. Use this when answering questions about documents the user has uploaded, or when they ask to summarize, find, or compare content from their files.",
    parameters: z.object({
      query: z.string().describe('The search query to find relevant document passages'),
      limit: z.number().min(1).max(10).optional().describe('Max chunks to return. Auto-calculated from query complexity if not set.'),
    }),
    execute: async ({ query, limit }) => {
      const timer = createTimer();
      const k = limit ?? getDynamicK(query);
      await log({ level: 'info', event: 'rag_search', userId, sessionId, message: `RAG search started`, metadata: { query: query.slice(0, 100), k, dynamic: !limit } });

      const supabase = createAdminClient();
      const { embedding } = await embed({ model: getEmbeddingModel(), value: query });
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: embedding, match_threshold: 0.3, match_count: k, filter_user_id: userId,
      });

      if (error) {
        await log({ level: 'error', event: 'rag_search', userId, sessionId, message: `RAG search failed: ${error.message}` });
        throw new Error(`RAG search failed: ${error.message}`);
      }

      const sources: DocumentSource[] = (data ?? []).map((row: { document_id: string; document_name: string; content: string; similarity: number; }) => ({
        documentId: row.document_id, documentName: row.document_name, chunkContent: row.content, similarity: row.similarity,
      }));

      await log({ level: 'info', event: 'tool_result', userId, sessionId, message: `RAG search completed`, metadata: { found: sources.length, k, topSimilarity: sources[0]?.similarity }, durationMs: timer.elapsed() });

      if (sources.length === 0) return { found: false, message: 'No relevant passages found in uploaded documents.' };
      return { found: true, sources, retrievedChunks: sources.length, dynamicK: k, context: sources.map(s => `[${s.documentName}]: ${s.chunkContent}`).join('\n\n---\n\n') };
    },
  });

export const webSearchTool = (userId?: string, sessionId?: string) =>
  tool({
    description: 'Search the live web for current information, recent news, or facts not in uploaded documents.',
    parameters: z.object({
      query: z.string().describe('The web search query'),
      maxResults: z.number().min(1).max(8).default(5),
    }),
    execute: async ({ query, maxResults }) => {
      const timer = createTimer();
      const apiKey = process.env.TAVILY_API_KEY;
      await log({ level: 'info', event: 'web_search', userId, sessionId, message: `Web search started`, metadata: { query: query.slice(0, 100), maxResults } });

      if (!apiKey) return { error: 'Web search is not configured.' };

      const supabase = createAdminClient();
      const { data: cached } = await supabase.from('search_cache').select('results').eq('query', query).gt('expires_at', new Date().toISOString()).single();
      if (cached) {
        await log({ level: 'debug', event: 'web_search', userId, sessionId, message: `Cache hit`, metadata: { query: query.slice(0, 100) } });
        return { sources: cached.results as WebSource[], cached: true };
      }

      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, include_answer: true }),
      });
      if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
      const data = await res.json();

      const sources: WebSource[] = (data.results ?? []).map((r: { url: string; title: string; content: string; published_date?: string; }) => ({
        url: r.url, title: r.title, snippet: r.content, publishedDate: r.published_date,
      }));

      await supabase.from('search_cache').upsert({ query, results: sources });
      await log({ level: 'info', event: 'tool_result', userId, sessionId, message: `Web search completed`, metadata: { resultsCount: sources.length }, durationMs: timer.elapsed() });
      return { sources, answerSummary: data.answer ?? null };
    },
  });

export const generateReportTool = (userId: string, sessionId?: string) =>
  tool({
    description: 'Generate and save a structured professional research report. Use when the user explicitly asks to generate a report.',
    parameters: z.object({
      title: z.string(),
      content: z.string().describe('Full report content in Markdown'),
      format: z.enum(['docx', 'md']).default('docx'),
    }),
    execute: async ({ title, content, format }) => {
      const timer = createTimer();
      await log({ level: 'info', event: 'tool_call', userId, sessionId, message: `Generating report: ${title}` });
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('reports').insert({ user_id: userId, session_id: sessionId ?? null, title, content, format }).select('id').single();
      if (error) throw new Error(`Failed to save report: ${error.message}`);
      await log({ level: 'info', event: 'tool_result', userId, sessionId, message: `Report saved: ${title}`, metadata: { reportId: data.id }, durationMs: timer.elapsed() });
      return { reportId: data.id, title, message: `Report "${title}" saved and available for download.` };
    },
  });

export const saveCitationTool = (userId: string, sessionId?: string) =>
  tool({
    description: 'Save a citation for a source referenced during research.',
    parameters: z.object({
      title: z.string(), authors: z.array(z.string()).default([]),
      url: z.string().optional(), publicationDate: z.string().optional(),
      publisher: z.string().optional(), source: z.enum(['document', 'web', 'manual']).default('manual'),
    }),
    execute: async ({ title, authors, url, publicationDate, publisher, source }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('citations').insert({ user_id: userId, session_id: sessionId ?? null, title, authors, url, publication_date: publicationDate, publisher, source }).select('id').single();
      if (error) throw new Error(`Failed to save citation: ${error.message}`);
      return { citationId: data.id, message: `Citation for "${title}" saved.` };
    },
  });

export const analyzeDataTool = (userId: string, sessionId?: string) =>
  tool({
    description: 'Analyse CSV data from uploaded documents. Use when user asks about trends, statistics, or charts.',
    parameters: z.object({
      documentId: z.string(),
      question: z.string(),
    }),
    execute: async ({ documentId, question }) => {
      await log({ level: 'info', event: 'tool_call', userId, sessionId, message: `Analysing data`, metadata: { documentId } });
      const supabase = createAdminClient();
      const { data: chunks } = await supabase.from('document_chunks').select('content').eq('document_id', documentId).eq('user_id', userId).order('chunk_index');
      if (!chunks || chunks.length === 0) return { error: 'Document not found.' };
      const fullContent = chunks.map((c: { content: string }) => c.content).join('\n');
      const lines = fullContent.split('\n').filter(l => l.trim());
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) ?? [];
      const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim().replace(/"/g, '')));
      return {
        question, headers, rowCount: rows.length, sampleRows: rows.slice(0, 5),
        columnTypes: headers.map(h => {
          const colIdx = headers.indexOf(h);
          const vals = rows.map(r => r[colIdx]).filter(Boolean);
          const numericCount = vals.filter(v => !isNaN(Number(v))).length;
          return { name: h, type: numericCount > vals.length * 0.7 ? 'numeric' : 'categorical' };
        }),
      };
    },
  });

export const compareDocumentsTool = (userId: string, sessionId?: string) =>
  tool({
    description: 'Compare two or more documents on a specific topic.',
    parameters: z.object({
      documentIds: z.array(z.string()).min(2).max(5),
      topic: z.string(),
    }),
    execute: async ({ documentIds, topic }) => {
      await log({ level: 'info', event: 'tool_call', userId, sessionId, message: `Comparing ${documentIds.length} docs on: ${topic.slice(0, 80)}` });
      const supabase = createAdminClient();
      const { embedding } = await embed({ model: getEmbeddingModel(), value: topic });
      const results = await Promise.all(documentIds.map(async docId => {
        const { data: doc } = await supabase.from('documents').select('name').eq('id', docId).eq('user_id', userId).single();
        const { data: chunks } = await supabase.rpc('match_document_chunks', { query_embedding: embedding, match_threshold: 0.2, match_count: 3, filter_user_id: userId }).eq('document_id', docId);
        return { documentId: docId, documentName: doc?.name ?? 'Unknown', passages: (chunks ?? []).map((c: { content: string; similarity: number }) => ({ content: c.content, similarity: c.similarity })) };
      }));
      return { topic, documents: results };
    },
  });

export function getAgentTools(userId: string, sessionId?: string, activeTools?: Record<string, boolean>) {
  const tools: Record<string, ReturnType<typeof tool>> = {};
  if (activeTools?.ragSearch !== false) tools.ragSearch = ragSearchTool(userId, sessionId);
  if (activeTools?.webSearch !== false) tools.webSearch = webSearchTool(userId, sessionId);
  if (activeTools?.generateReport !== false) tools.generateReport = generateReportTool(userId, sessionId);
  if (activeTools?.saveCitation !== false) tools.saveCitation = saveCitationTool(userId, sessionId);
  if (activeTools?.analyzeData !== false) tools.analyzeData = analyzeDataTool(userId, sessionId);
  if (activeTools?.compareSources !== false) tools.compareDocuments = compareDocumentsTool(userId, sessionId);
  return tools;
}