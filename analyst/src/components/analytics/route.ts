// src/app/api/analytics/route.ts
// Aggregates real token usage and cost data from chat_messages and chat_sessions.
// This powers the AnalyticsPanel — token_count and cost columns must exist
// in your chat_messages table (they are in schema.sql).

import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // ── 1. Total messages, tokens, cost ──────────────────────────────────────
  const { data: totals } = await admin
    .from('chat_messages')
    .select('token_count, cost, feedback, created_at, model_id')
    .eq('user_id', user.id)
    .eq('role', 'assistant');   // only count assistant messages for tokens/cost

  const totalMessages = totals?.length ?? 0;
  const totalTokens   = totals?.reduce((s, m) => s + (m.token_count ?? 0), 0) ?? 0;
  const totalCost     = totals?.reduce((s, m) => s + (m.cost ?? 0), 0) ?? 0;
  const positiveRatings = totals?.filter(m => m.feedback === 'up').length   ?? 0;
  const negativeRatings = totals?.filter(m => m.feedback === 'down').length ?? 0;

  // ── 2. Messages by day (last 30 days) ────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: allMessages } = await admin
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Group by date string
  const dayMap: Record<string, number> = {};
  for (const msg of allMessages ?? []) {
    const day = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }
  const messagesByDay = Object.entries(dayMap).map(([date, messages]) => ({ date, messages }));

  // ── 3. Tokens by model ───────────────────────────────────────────────────
  const modelMap: Record<string, number> = {};
  for (const msg of totals ?? []) {
    if (!msg.model_id) continue;
    modelMap[msg.model_id] = (modelMap[msg.model_id] ?? 0) + (msg.token_count ?? 0);
  }
  const tokensByModel = Object.entries(modelMap)
    .map(([model, tokens]) => ({ model, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  // ── 4. Cost by model (bonus — shown in insights) ─────────────────────────
  const costByModel: Record<string, number> = {};
  for (const msg of totals ?? []) {
    if (!msg.model_id) continue;
    costByModel[msg.model_id] = (costByModel[msg.model_id] ?? 0) + (msg.cost ?? 0);
  }
  const costBreakdown = Object.entries(costByModel)
    .map(([model, cost]) => ({ model, cost: parseFloat(cost.toFixed(6)) }))
    .sort((a, b) => b.cost - a.cost);

  return Response.json({
    totalMessages,
    totalTokens,
    totalCost: parseFloat(totalCost.toFixed(6)),
    positiveRatings,
    negativeRatings,
    messagesByDay,
    tokensByModel,
    costBreakdown,
  });
}