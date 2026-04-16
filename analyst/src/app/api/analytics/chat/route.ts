import { createServerSupabaseClient } from '@/lib/db/supabase';
import { getLanguageModel } from '@/lib/ai/providers';
import { generateText } from 'ai';

import { sanitizeMessages, checkRateLimit } from '@/lib/utils/sanitize';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  //  RATE LIMITING
  const { allowed } = checkRateLimit(user.id, 30, 60_000);
  if (!allowed) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
      }
    );
  }

  // ✅ GET RAW BODY
  const rawBody = await req.json();
  const { question, data } = rawBody;

  // ✅ SANITIZE QUESTION (adapted for your structure)
  const sanitized = sanitizeMessages([
    { role: 'user', content: question }
  ]);

  if (!sanitized.length) {
    return Response.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const safeQuestion = sanitized[0].content;

  try {
    const model = getLanguageModel('gpt-4o-mini');

    const prompt = `You are an AI analytics expert. The user is asking about their own usage data.

Analytics data:
- Total messages: ${data.totalMessages}
- Total tokens: ${data.totalTokens}
- Estimated cost: $${data.totalCost?.toFixed(4)}
- Positive ratings: ${data.positiveRatings}
- Negative ratings: ${data.negativeRatings}
- Peak day: ${data.messagesByDay?.reduce((a: any, b: any) => a.messages > b.messages ? a : b, { date: 'N/A', messages: 0 })?.date}
- Top model: ${data.tokensByModel?.[0]?.model ?? 'N/A'}

User question: ${safeQuestion}

Answer clearly, professionally, and specifically based on the data above. Keep it under 3 sentences.`;

    const result = await generateText({ model, prompt, maxTokens: 200 });

    return Response.json({ answer: result.text });

  } catch (error: any) {
    return Response.json({ answer: 'Unable to analyze at this time. Please try again.' });
  }
}