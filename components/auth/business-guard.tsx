'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useBusiness } from '@/features/business/hooks/use-business';

const SETUP_ROUTE = '/dashboard/setup';

export function BusinessGuard({ children }: { children: React.ReactNode }) {
    const {
        membership,
        loading: businessLoading,
        error,
        refresh,
    } = useBusiness();
    const { user, loading: authLoading, initialized } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const loading = !initialized || authLoading || businessLoading;
    const isSetup = pathname === SETUP_ROUTE;

    useEffect(() => {
        if (loading || !user || error) return;

        if (!membership && !isSetup) {
            router.replace(SETUP_ROUTE);
        } else if (membership && isSetup) {
            router.replace('/dashboard');
        }
    }, [error, isSetup, loading, membership, router, user]);

    if (loading) return <GuardLoading label="Loading your business" />;

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-6">
                <div className="max-w-md text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
                    <h1 className="mt-4 text-h3 text-foreground">We could not load your business</h1>
                    <p className="mt-2 text-body text-muted-foreground">
                        This may be a temporary connection or authorization problem. Your setup state has not been changed.
                    </p>
                    <Button className="mt-6" onClick={() => void refresh()}>
                        Try again
                    </Button>
                </div>
            </div>
        );
    }

    const redirecting = (!membership && !isSetup) || (membership && isSetup);

    if (redirecting) return <GuardLoading label="Redirecting" />;

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
