import { createServerSupabaseClient } from '@/lib/db/supabase';
import { getLanguageModel } from '@/lib/ai/providers';
import { generateText } from 'ai';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { summary } = await req.json();

  // Smart alerts (no AI needed)
  const alerts: string[] = [];
  const avgPerDay = summary.messagesByDay?.reduce((a: any, b: any) => a + b.messages, 0) / (summary.messagesByDay?.length || 1);
  const predictedNextWeek = Math.round(avgPerDay * 7);
  const ratingRatio = summary.totalMessages > 0 ? summary.positiveRatings / summary.totalMessages : 0;

  if (summary.totalCost > 0.5) alerts.push('Cost rising - consider switching to a faster model for simple queries');
  if (ratingRatio < 0.5 && summary.totalMessages > 5) alerts.push('Response quality is low - try rephrasing your questions');
  if (avgPerDay > 20) alerts.push('High usage detected - you are a power user!');

  // AI-generated insight
  let insight = null;
  try {
    const model = getLanguageModel('gpt-4o-mini');
    const prompt = `You are an AI analytics expert analyzing a researcher's usage data.

Provide a 3-part analysis:
1. KEY INSIGHT: One sharp observation about their research behavior
2. USAGE PATTERN: What kind of researcher they are
3. RECOMMENDATION: One specific actionable suggestion

DATA:
- Total messages: ${summary.totalMessages}
- Total tokens: ${summary.totalTokens}
- Cost: $${summary.totalCost?.toFixed(4)}
- Positive ratings: ${summary.positiveRatings}
- Peak day: ${summary.messagesByDay?.reduce((a: any, b: any) => a.messages > b.messages ? a : b, { date: 'N/A', messages: 0 })?.date}
- Top model: ${summary.tokensByModel?.[0]?.model ?? 'N/A'}
- Predicted next week: ${predictedNextWeek} messages

Keep each point to 1-2 sentences. Be specific, not generic.`;

    const result = await generateText({ model, prompt, maxTokens: 300 });
    insight = result.text;
  } catch (e) {
    insight = `You have sent ${summary.totalMessages} messages using ${summary.totalTokens?.toLocaleString()} tokens. Predicted usage next week: ${predictedNextWeek} messages.`;
  }

  return Response.json({
    insight,
    alerts,
    prediction: {
      nextWeekMessages: predictedNextWeek,
      avgPerDay: Math.round(avgPerDay),
    },
  });
}
