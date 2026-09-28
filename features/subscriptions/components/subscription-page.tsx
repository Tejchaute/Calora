'use client';
import { Info, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/providers/subscription-provider';
import { SubscriptionStatusCard } from './subscription-status-card';

export function SubscriptionPage() {
  const { loading, error, refresh, presentation } = useSubscription();
  if (loading) return <SubscriptionPageSkeleton />;
  if (error || !presentation) return (
    <div className="mx-auto max-w-3xl py-8"><Card><CardContent className="p-8 text-center" role="alert">
      <Info className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 text-h3 text-foreground">Subscription details are unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">We could not load your subscription status. Your workspace data remains protected.</p>
      <Button className="mt-6" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Retry</Button>
    </CardContent></Card></div>
  );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><h1 className="text-2xl font-bold text-foreground">Subscription</h1><p className="mt-1 text-sm text-muted-foreground">Understand your workspace access and current Calora subscription.</p></header>
      <SubscriptionStatusCard />
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">What happens next</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">
          {presentation.isTrial && !presentation.isExpired ? 'Your workspace remains fully available until the trial ends. Subscription options will be added separately.' : presentation.isExpired ? 'Your business data remains associated with this workspace while product access is paused. Payment setup is not available yet.' : 'Your workspace is active. No billing amount or renewal date is available for this subscription.'}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />Your workspace</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">Subscription access belongs to your Calora business. Customer, appointment, service, and staff information stays connected to that workspace.</CardContent></Card>
      </div>
    </div>
  );
}

function SubscriptionPageSkeleton() {
  return <div className="mx-auto max-w-5xl space-y-6" aria-busy="true" aria-label="Loading subscription details"><Skeleton className="h-8 w-48" /><Skeleton className="h-72 w-full rounded-xl" /><div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></div></div>;
}
