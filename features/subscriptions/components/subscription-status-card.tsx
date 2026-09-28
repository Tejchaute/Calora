'use client';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/providers/business-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { formatSubscriptionDate } from '../lib/subscription-presentation';
import { TrialProgress } from './trial-progress';

export function SubscriptionStatusCard({ compact = false }: { compact?: boolean }) {
  const { business, settings } = useBusiness();
  const { subscription, presentation } = useSubscription();
  const reduceMotion = useReducedMotion();
  if (!subscription || !presentation) return null;
  const endDate = formatSubscriptionDate(subscription.trial_ends_at, settings?.timezone);
  const Icon = presentation.tone === 'active' ? CheckCircle2 : presentation.tone === 'restricted' ? ShieldCheck : Clock3;

  if (compact) return (
    <div className={cn('flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between', presentation.isNearExpiration ? 'border-warning/40 bg-warning/5' : 'border-border bg-card')}>
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', presentation.isNearExpiration ? 'text-warning' : 'text-primary')} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{presentation.shortLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{endDate ? `Trial ends ${endDate}` : presentation.description}</p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto"><Link href="/dashboard/subscription">View subscription</Link></Button>
    </div>
  );

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <Card className="overflow-hidden border-border shadow-elevation-2"><CardContent className="p-0">
        <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
          <section className="p-6 sm:p-8" aria-labelledby="subscription-status-title">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={cn('gap-1.5 border-current font-medium', presentation.tone === 'warning' && 'text-warning', presentation.tone === 'active' && 'text-success', presentation.tone === 'restricted' && 'text-destructive', presentation.tone === 'trial' && 'text-primary')}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />{presentation.isTrial ? 'Free trial' : presentation.isLegacy ? 'Active' : subscription.status}
              </Badge>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business subscription</span>
            </div>
            <h2 id="subscription-status-title" className="mt-5 text-h2 text-foreground">{presentation.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{presentation.description}</p>
            {presentation.isTrial && presentation.daysRemaining !== null && presentation.totalTrialDays !== null && presentation.progressPercent !== null && (
              <div className="mt-7 max-w-xl">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div><p className="text-3xl font-semibold tabular-nums text-foreground">{presentation.daysRemaining}</p><p className="text-sm text-muted-foreground">{presentation.daysRemaining === 1 ? 'day remaining' : 'days remaining'}</p></div>
                  <span className="text-sm font-medium text-foreground">{presentation.totalTrialDays} days free</span>
                </div>
                <TrialProgress value={presentation.progressPercent} daysRemaining={presentation.daysRemaining} totalDays={presentation.totalTrialDays} warning={presentation.isNearExpiration} />
              </div>
            )}
          </section>
          <aside className="border-t border-border bg-muted/35 p-6 sm:p-8 lg:border-l lg:border-t-0" aria-label="Subscription details">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-primary shadow-elevation-1"><CalendarClock className="h-5 w-5" aria-hidden="true" /></div><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</p><p className="truncate text-sm font-semibold text-foreground">{business?.name || 'Calora business'}</p></div></div>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-muted-foreground">Current status</dt><dd className="mt-1 font-medium capitalize text-foreground">{presentation.isLegacy ? 'Active' : subscription.status}</dd></div>
              {endDate && <div><dt className="text-muted-foreground">Trial end date</dt><dd className="mt-1 font-medium text-foreground">{endDate}</dd></div>}
              <div><dt className="text-muted-foreground">Access</dt><dd className="mt-1 font-medium text-foreground">{subscription.access_allowed ? 'Workspace available' : 'Workspace restricted'}</dd></div>
            </dl>
          </aside>
        </div>
      </CardContent></Card>
    </motion.div>
  );
}
