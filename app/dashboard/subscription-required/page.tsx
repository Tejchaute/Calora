'use client';

import Link from 'next/link';
import { CreditCard, LogOut, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/providers/auth-provider';
import { useBusiness } from '@/providers/business-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { formatSubscriptionDate } from '@/features/subscriptions/lib/subscription-presentation';

export default function SubscriptionRequiredPage() {
    const { signOut } = useAuth();
    const { business, settings } = useBusiness();
    const { subscription, presentation } = useSubscription();
    const endDate = formatSubscriptionDate(subscription?.trial_ends_at ?? null, settings?.timezone);

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
            <Card className="w-full max-w-xl border-border shadow-elevation-2">
                <CardContent className="p-8 text-center sm:p-10">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <CreditCard className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>

                    <h1 className="mt-6 text-h2 text-foreground">
                        {presentation?.title || 'Subscription access required'}
                    </h1>

                    <p className="mt-3 text-body leading-relaxed text-muted-foreground">
                        {business?.name
                            ? `${business.name} is currently restricted because it does not have active subscription access.`
                            : 'This workspace does not currently have active subscription access.'}
                    </p>
                    {endDate && (
                        <p className="mt-3 text-sm font-medium text-foreground">
                            Trial ended {endDate}
                        </p>
                    )}

                    <div className="mt-7 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-left">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <p className="text-small leading-relaxed text-muted-foreground">
                            Your business and appointment data remains protected while access is paused.
                        </p>
                    </div>
                    <p className="mt-5 text-sm leading-6 text-muted-foreground">
                        Subscription options and payment setup are not available yet.
                        No charge or payment can be processed from this page.
                    </p>
                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild>
                            <Link href="/dashboard/subscription">View subscription details</Link>
                        </Button>
                        <Button variant="outline" onClick={() => void signOut()}>
                            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                            Sign out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
