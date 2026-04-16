import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';
import { getLanguageModel, estimateCost } from '@/lib/ai/providers';
import { streamText, generateText } from 'ai';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { getAgentTools } from '@/lib/ai/tools';
import { log, createTimer } from '@/lib/logger';
import { sanitizeMessages, checkRateLimit } from '@/lib/utils/sanitize';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const timer = createTimer();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const { allowed } = checkRateLimit(user.id, 30, 60_000);
  if (!allowed) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const rawBody = await req.json();
  const {
    messages: rawMessages,
    modelId = 'gpt-4o-mini',
    sessionId,
    activeTools,
    temperature,
    maxTokens,
    personality,
    // ── Analytics chat (used by AnalyticsPanel "Ask your analytics") ────────
    question,
    data: analyticsData,
  } = rawBody;

  // ── Analytics Q&A shortcut (non-streaming, lightweight) ──────────────────
  if (question && analyticsData) {
    try {
      const model = getLanguageModel(modelId);
      const peakDay = analyticsData?.messagesByDay?.reduce(
        (a: any, b: any) => (a.messages > b.messages ? a : b),
        { date: 'N/A', messages: 0 }
      );
      const result = await generateText({
        model,
        maxTokens: 200,
        temperature: 0.5,
        prompt: `You are an AI analytics expert. Answer the user's question about their usage data.
Data: total messages=${analyticsData.totalMessages}, total tokens=${analyticsData.totalTokens}, estimated cost=$${analyticsData.totalCost?.toFixed(4)}, positive ratings=${analyticsData.positiveRatings}, peak day=${peakDay?.date}, top model=${analyticsData.tokensByModel?.[0]?.model ?? 'N/A'}.
Question: ${question}
Answer clearly and specifically in under 3 sentences.`,
      });
      return Response.json({ answer: result.text });
    } catch (e: any) {
      return Response.json({ answer: 'Unable to analyze at this time.' });
    }
  }

  // ── Main streaming chat ───────────────────────────────────────────────────
  const messages = sanitizeMessages(rawMessages ?? []);
  if (messages.length === 0) {
    return Response.json({ error: 'No valid messages provided.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  try {
    await log({
      level: 'info', event: 'chat_start', userId: user.id, sessionId,
      message: `Chat started`, metadata: { modelId, messageCount: messages.length },
    });

    // Fetch user's document names for system prompt context
    const { data: docs } = await adminClient
      .from('documents')
      .select('name')
      .eq('user_id', user.id)
      .eq('status', 'ready');

    const documentNames = (docs ?? []).map((d: { name: string }) => d.name);

    const model = getLanguageModel(modelId);
    const tools = getAgentTools(user.id, sessionId, activeTools);
    const systemPrompt = buildSystemPrompt({ personality, temperature }, documentNames);

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: messages as any,
      tools,
      maxSteps: 5,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2000,
      onFinish: async ({ text, usage }) => {
        const inputTokens  = usage?.promptTokens     ?? 0;
        const outputTokens = usage?.completionTokens ?? 0;
        const cost = estimateCost(modelId, inputTokens, outputTokens);

        await log({
          level: 'info', event: 'chat_finish', userId: user.id, sessionId,
          message: `Chat finished`,
          metadata: { modelId, inputTokens, outputTokens, cost },
          durationMs: timer.elapsed(),
        });

        if (sessionId) {
          // Auto-name session from first message
          const firstMsg = messages[0];
          if (firstMsg && typeof firstMsg.content === 'string') {
            const topic = firstMsg.content.slice(0, 60).trim();
            const titleCheck = await adminClient
              .from('chat_sessions')
              .select('title')
              .eq('id', sessionId)
              .single();
            if ((titleCheck.data?.title === 'New Research Session' || titleCheck.data?.title === 'Untitled session' || titleCheck.data?.title === 'New session') && topic) {
              await adminClient
                .from('chat_sessions')
                .update({ title: topic })
                .eq('id', sessionId);
            }
          }

          // Save user message
          const userMessage = messages[messages.length - 1];
          if (userMessage?.role === 'user') {
            await adminClient.from('chat_messages').insert({
              session_id: sessionId,
              user_id: user.id,
              role: 'user',
              content: typeof userMessage.content === 'string'
                ? userMessage.content
                : JSON.stringify(userMessage.content),
              model_id: modelId,
            });
          }

          // Save assistant message with token + cost data
          if (text) {
            await adminClient.from('chat_messages').insert({
              session_id: sessionId,
              user_id: user.id,
              role: 'assistant',
              content: text,
              token_count: outputTokens,
              cost,
              model_id: modelId,
            });
          }

          // Update session totals
          await adminClient
            .from('chat_sessions')
            .update({
              updated_at: new Date().toISOString(),
              total_tokens: inputTokens + outputTokens,
              total_cost: cost,
            })
            .eq('id', sessionId);
        }
      },
    });

    return result.toAIStreamResponse({ headers: { 'X-Model-Id': modelId } });

  } catch (error: any) {
    await log({
      level: 'error', event: 'api_error', userId: user.id, sessionId,
      message: `Chat failed: ${error?.message}`,
      durationMs: timer.elapsed(),
    });
    const isQuota = error?.message?.includes('insufficient_quota') || error?.statusCode === 429;
    return Response.json(
      { error: isQuota ? 'API quota exceeded.' : error?.message ?? 'Unexpected error.' },
      { status: isQuota ? 429 : 500 }
    );
  }
}