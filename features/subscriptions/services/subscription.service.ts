import { z } from 'zod';

import { supabase } from '@/lib/supabase/client';
import type { SubscriptionAccess } from '@/types/database';

const subscriptionAccessSchema = z.object({
    subscription_id: z.string().uuid(),
    business_id: z.string().uuid(),
    plan: z.enum(['free_trial', 'legacy', 'paid']),
    status: z.enum(['trialing', 'active', 'past_due', 'canceled']),
    trial_started_at: z.string().nullable(),
    trial_ends_at: z.string().nullable(),
    current_period_start: z.string().nullable(),
    current_period_end: z.string().nullable(),
    server_now: z.string(),
    access_allowed: z.boolean(),
    access_reason: z.enum([
        'active_subscription',
        'active_trial',
        'trial_expired',
        'subscription_required',
    ]),
});

export async function getSubscriptionAccess(
    businessId: string
): Promise<SubscriptionAccess | null> {
    const { data, error } = await supabase.rpc('get_subscription_access', {
        p_business_id: businessId,
    });

    if (error) throw error;

    const rows = z.array(subscriptionAccessSchema).parse(data ?? []);
    return rows[0] ?? null;
}
