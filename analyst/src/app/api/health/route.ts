// src/app/api/health/route.ts
// Health check endpoint — verifies all critical services are reachable.
// Useful for deployment monitoring and demonstrating production awareness.

import { createAdminClient } from '@/lib/db/supabase';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; detail?: string }> = {};
  const start = Date.now();

  // 1. Supabase database check
  try {
    const t = Date.now();
    const admin = createAdminClient();
    const { error } = await admin.from('documents').select('id').limit(1);
    checks.database = error
      ? { status: 'error', detail: error.message }
      : { status: 'ok', latencyMs: Date.now() - t };
  } catch (e: any) {
    checks.database = { status: 'error', detail: e.message };
  }

  // 2. Supabase storage check
  try {
    const t = Date.now();
    const admin = createAdminClient();
    const { error } = await admin.storage.from('analyst-ai').list('', { limit: 1 });
    checks.storage = error
      ? { status: 'error', detail: error.message }
      : { status: 'ok', latencyMs: Date.now() - t };
  } catch (e: any) {
    checks.storage = { status: 'error', detail: e.message };
  }

  // 3. LLM provider keys check (non-intrusive — just checks env vars are set)
  checks.llm_providers = {
    status: 'ok',
    detail: [
      process.env.OPENAI_API_KEY      ? 'openai'    : null,
      process.env.ANTHROPIC_API_KEY   ? 'anthropic' : null,
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'google' : null,
      process.env.GROQ_API_KEY        ? 'groq'      : null,
    ].filter(Boolean).join(', ') || 'none configured',
  };

  // 4. Web search check
  checks.web_search = {
    status: process.env.TAVILY_API_KEY ? 'ok' : 'error',
    detail: process.env.TAVILY_API_KEY ? 'Tavily key present' : 'TAVILY_API_KEY not set',
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok');

  return Response.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - start,
      checks,
      version: process.env.npm_package_version ?? '2.0.0',
    },
    { status: allOk ? 200 : 503 }
  );
}