'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { useBusiness } from '@/providers/business-provider';
import { getSubscriptionAccess } from '@/features/subscriptions/services/subscription.service';
import type { SubscriptionAccess } from '@/types/database';
import { createSubscriptionPresentation, type SubscriptionPresentation } from '@/features/subscriptions/lib/subscription-presentation';

interface SubscriptionContextValue {
    subscription: SubscriptionAccess | null;
    presentation: SubscriptionPresentation | null;
    accessAllowed: boolean;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { business, membership, loading: businessLoading } = useBusiness();
    const businessId = business?.id ?? null;
    const membershipId = membership?.id ?? null;

    const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null);
    const [loadedBusinessId, setLoadedBusinessId] = useState<string | null>(null);
    const [requestLoading, setRequestLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        requestIdRef.current += 1;
        setSubscription(null);
        setLoadedBusinessId(null);
        setError(null);
        setRequestLoading(Boolean(businessId));
    }, [businessId]);

    const loadSubscription = useCallback(async () => {
        const requestId = ++requestIdRef.current;

        if (!businessId || !membershipId) {
            setSubscription(null);
            setLoadedBusinessId(null);
            setError(null);
            setRequestLoading(false);
            return;
        }

        setRequestLoading(true);
        setError(null);

        try {
            const nextSubscription = await getSubscriptionAccess(businessId);

            if (requestId !== requestIdRef.current) return;

            setSubscription(nextSubscription);
            setLoadedBusinessId(businessId);
        } catch (cause) {
            if (requestId !== requestIdRef.current) return;

            setSubscription(null);
            setLoadedBusinessId(businessId);
            setError(
                cause instanceof Error
                    ? cause
                    : new Error('Unable to verify subscription access.')
            );
        } finally {
            if (requestId === requestIdRef.current) {
                setRequestLoading(false);
            }
        }
    }, [businessId, membershipId]);

    useEffect(() => {
        if (businessLoading) return;
        void loadSubscription();
    }, [businessLoading, loadSubscription]);

    const loading = businessLoading
        || requestLoading
        || (Boolean(businessId) && loadedBusinessId !== businessId);

    const currentBusinessLoaded = !businessId || loadedBusinessId === businessId;
    const currentSubscription = currentBusinessLoaded ? subscription : null;
    const presentation = useMemo(() => createSubscriptionPresentation(currentSubscription), [currentSubscription]);
    const value = useMemo<SubscriptionContextValue>(() => ({
        subscription: currentSubscription,
        presentation,
        accessAllowed: currentSubscription?.access_allowed ?? false,
        loading,
        error,
        refresh: loadSubscription,
    }), [currentSubscription, error, loadSubscription, loading, presentation]);

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription(): SubscriptionContextValue {
    const context = useContext(SubscriptionContext);

    if (!context) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }

    return context;
}
