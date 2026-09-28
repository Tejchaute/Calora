'use client';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/providers/subscription-provider';

export function SubscriptionIndicator() {
  const { presentation, loading } = useSubscription();
  if (loading) return <Skeleton className="hidden h-9 w-28 rounded-full sm:block" />;
  if (!presentation) return null;
  return (
    <Link href="/dashboard/subscription" className={cn('inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', presentation.isNearExpiration ? 'border-warning/40 bg-warning/10 text-foreground hover:bg-warning/15' : presentation.isExpired ? 'border-destructive/40 bg-destructive/10 text-foreground hover:bg-destructive/15' : 'border-border bg-card text-foreground hover:bg-muted')} aria-label={`${presentation.shortLabel}. View subscription details.`}>
      <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="max-w-[9rem] truncate">{presentation.shortLabel}</span>
    </Link>
  );
}
