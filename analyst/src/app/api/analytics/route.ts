import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';
import { format, subDays } from 'date-fns';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const since = subDays(new Date(), 30).toISOString();

    const { data: messages } = await admin
      .from('chat_messages')
      .select('created_at, token_count, cost, model_id, feedback, role')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return Response.json({
        totalMessages: 0, totalTokens: 0, totalCost: 0,
        positiveRatings: 0, negativeRatings: 0,
        messagesByDay: [], tokensByModel: [],
      });
    }

    const totalMessages = messages.length;
    const totalTokens = messages.reduce((s, m) => s + (m.token_count ?? 0), 0);
    const totalCost = messages.reduce((s, m) => s + (m.cost ?? 0), 0);
    const positiveRatings = messages.filter(m => m.feedback === 'up').length;
    const negativeRatings = messages.filter(m => m.feedback === 'down').length;

    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      dayMap[format(subDays(new Date(), i), 'MMM d')] = 0;
    }
    messages.forEach(m => {
      const day = format(new Date(m.created_at), 'MMM d');
      if (dayMap[day] !== undefined) dayMap[day]++;
    });
    const messagesByDay = Object.entries(dayMap).map(([date, msgs]) => ({ date, messages: msgs }));

    const modelMap: Record<string, number> = {};
    messages.forEach(m => {
      if (m.model_id) modelMap[m.model_id] = (modelMap[m.model_id] ?? 0) + (m.token_count ?? 0);
    });
    const tokensByModel = Object.entries(modelMap).map(([model, tokens]) => ({ model, tokens }));

    return Response.json({ totalMessages, totalTokens, totalCost, positiveRatings, negativeRatings, messagesByDay, tokensByModel });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}