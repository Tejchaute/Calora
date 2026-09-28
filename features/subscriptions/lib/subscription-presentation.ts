import type { SubscriptionAccess } from '@/types/database';

const DAY_MS = 24 * 60 * 60 * 1000;
export type SubscriptionTone = 'trial' | 'warning' | 'active' | 'restricted';
export interface SubscriptionPresentation {
  title: string; shortLabel: string; description: string; tone: SubscriptionTone;
  isTrial: boolean; isNearExpiration: boolean; isExpired: boolean; isLegacy: boolean;
  daysRemaining: number | null; totalTrialDays: number | null; progressPercent: number | null;
}

export function createSubscriptionPresentation(subscription: SubscriptionAccess | null): SubscriptionPresentation | null {
  if (!subscription) return null;
  const isTrial = subscription.plan === 'free_trial';
  const isLegacy = subscription.plan === 'legacy' && subscription.status === 'active';
  const isExpired = !subscription.access_allowed;
  if (isTrial && subscription.trial_started_at && subscription.trial_ends_at) {
    const serverNow = new Date(subscription.server_now).getTime();
    const startedAt = new Date(subscription.trial_started_at).getTime();
    const endsAt = new Date(subscription.trial_ends_at).getTime();
    const duration = Math.max(endsAt - startedAt, 1);
    const remaining = Math.max(endsAt - serverNow, 0);
    const daysRemaining = Math.ceil(remaining / DAY_MS);
    const totalTrialDays = Math.max(1, Math.round(duration / DAY_MS));
    const progressPercent = Math.min(100, Math.max(0, ((serverNow - startedAt) / duration) * 100));
    const isNearExpiration = !isExpired && daysRemaining <= 3;
    return {
      title: isExpired ? 'Your Calora trial has ended' : 'Your trial is active',
      shortLabel: isExpired ? 'Trial ended' : `Trial - ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`,
      description: isExpired ? 'Subscription access is required to continue using your workspace.' : isNearExpiration ? 'Your workspace remains fully available through the end of your trial.' : 'Explore Calora and get your scheduling workflow running.',
      tone: isExpired ? 'restricted' : isNearExpiration ? 'warning' : 'trial',
      isTrial, isNearExpiration, isExpired, isLegacy, daysRemaining, totalTrialDays, progressPercent,
    };
  }
  const active = subscription.access_allowed && subscription.status === 'active';
  return {
    title: active ? 'Active subscription' : 'Subscription access required',
    shortLabel: active ? 'Subscription active' : 'Access restricted',
    description: active ? 'Your Calora workspace is active and ready for business.' : 'Your workspace is currently unavailable until subscription access is restored.',
    tone: active ? 'active' : 'restricted', isTrial: false, isNearExpiration: false,
    isExpired: !active, isLegacy, daysRemaining: null, totalTrialDays: null, progressPercent: null,
  };
}

export function formatSubscriptionDate(value: string | null, timeZone?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: timeZone || 'UTC' }).format(new Date(value));
}
