import { createAdminClient } from '@/lib/db/supabase';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogEvent = 'rag_search' | 'web_search' | 'tool_call' | 'tool_result' | 'chat_start' | 'chat_finish' | 'ingest_start' | 'ingest_finish' | 'ingest_error' | 'auth_event' | 'api_error';

interface LogEntry {
  level: LogLevel;
  event: LogEvent;
  userId?: string;
  sessionId?: string;
  message: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

export async function log(entry: LogEntry): Promise<void> {
  const prefix = `[${entry.level.toUpperCase()}][${entry.event}]`;
  const meta = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : '';
  const duration = entry.durationMs ? ` | ${entry.durationMs}ms` : '';
  console.log(`${prefix} ${entry.message}${duration}${meta}`);
  try {
    const admin = createAdminClient();
    await admin.from('logs').insert({
      level: entry.level, event: entry.event,
      user_id: entry.userId ?? null, session_id: entry.sessionId ?? null,
      message: entry.message, metadata: entry.metadata ?? {},
      duration_ms: entry.durationMs ?? null,
    });
  } catch (e) {
    console.error('[LOGGER] Failed to persist log:', e);
  }
}

export function createTimer() {
  const start = Date.now();
  return { elapsed: () => Date.now() - start };
}

export function getDynamicK(query: string): number {
  const lower = query.toLowerCase();
  const broadTerms = ['all', 'everything', 'summarize', 'summary', 'compare', 'overview', 'full', 'entire', 'complete'];
  const hasBroadTerm = broadTerms.some(t => lower.includes(t));
  if (hasBroadTerm) return 10;
  if (query.length > 150) return 8;
  if (query.length > 50) return 5;
  return 3;
}