// src/app/api/usage/route.ts
// Returns the user's current message usage for the billing UI.
// Reads real data from chat_messages — no fake numbers.

import { createServerSupabaseClient, createAdminClient } from '@/lib/db/supabase';

const FREE_TIER_LIMIT = 100; // messages per month

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Count messages sent this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await admin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')   // only count user messages (not assistant responses)
      .gte('created_at', startOfMonth.toISOString());

    const used = count ?? 0;

    return Response.json({
      used,
      limit: FREE_TIER_LIMIT,
      remaining: Math.max(FREE_TIER_LIMIT - used, 0),
      plan: 'free',           // hardcoded — no real billing yet
      resetDate: new Date(
        startOfMonth.getFullYear(),
        startOfMonth.getMonth() + 1,
        1
      ).toISOString(),
    });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}