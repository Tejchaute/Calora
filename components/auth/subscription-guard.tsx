'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useBusiness } from '@/providers/business-provider';
import { useSubscription } from '@/providers/subscription-provider';

const SETUP_ROUTE = '/dashboard/setup';
const SUBSCRIPTION_REQUIRED_ROUTE = '/dashboard/subscription-required';
const SUBSCRIPTION_ROUTE = '/dashboard/subscription';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { membership } = useBusiness();
    const { accessAllowed, loading, error, refresh } = useSubscription();

    const isSetup = pathname === SETUP_ROUTE;
    const isSubscriptionRequired = pathname === SUBSCRIPTION_REQUIRED_ROUTE;
    const isSubscription = pathname === SUBSCRIPTION_ROUTE;

    useEffect(() => {
        if (isSetup || isSubscription || !membership || loading || error) return;

        if (!accessAllowed && !isSubscriptionRequired) {
            router.replace(SUBSCRIPTION_REQUIRED_ROUTE);
        } else if (accessAllowed && isSubscriptionRequired) {
            router.replace('/dashboard');
        }
    }, [
        accessAllowed,
        error,
        isSetup,
        isSubscriptionRequired,
        isSubscription,
        loading,
        membership,
        router,
    ]);

    if (isSetup || !membership) return <>{children}</>;

    if (loading) {
        return <GuardLoading label="Checking subscription access" />;
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-6">
                <div className="max-w-md text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
                    <h1 className="mt-4 text-h3 text-foreground">We could not verify access</h1>
                    <p className="mt-2 text-body text-muted-foreground">
                        Your data remains protected. Retry the subscription check to continue.
                    </p>
                    <Button className="mt-6" onClick={() => void refresh()}>
                        Try again
                    </Button>
                </div>
            </div>
        );
    }

    const redirecting = !isSubscription && (
        (!accessAllowed && !isSubscriptionRequired)
        || (accessAllowed && isSubscriptionRequired));

    if (redirecting) {
        return <GuardLoading label="Redirecting" />;
    }

    return <>{children}</>;
}

function GuardLoading({ label }: { label: string }) {
    return (
        <div
            className="flex min-h-screen items-center justify-center bg-background"
            aria-busy="true"
        >
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label={label} />
        </div>
    );
}
