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

import { useAuth } from '@/providers/auth-provider';
import {
    getBusinessMembership,
    getBusinessById,
    getBusinessSettingsById,
} from '@/features/business/services/business.service';
import type { Business, BusinessMember, BusinessSettings } from '@/types/database';

interface BusinessContextValue {
    business: Business | null;
    membership: BusinessMember | null;
    settings: BusinessSettings | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
    const {
        user,
        profile,
        loading: authLoading,
        initialized,
        error: authError,
        refreshProfile,
    } = useAuth();
    const userId = user?.id ?? null;
    const profileId = profile?.id ?? null;

    const [business, setBusiness] = useState<Business | null>(null);
    const [membership, setMembership] = useState<BusinessMember | null>(null);
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
    const requestIdRef = useRef(0);
    const loadedUserIdRef = useRef<string | null>(null);

    const loadBusiness = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const isBootstrap = loadedUserIdRef.current !== userId;

        if (!userId) {
            setBusiness(null);
            setMembership(null);
            setSettings(null);
            setError(null);
            setLoadedUserId(null);
            loadedUserIdRef.current = null;
            setLoading(false);
            return;
        }

        if (isBootstrap) {
            setLoading(true);
            setError(null);
        }

        try {
            let nextMembership: BusinessMember | null;

            try {
                nextMembership = await getBusinessMembership(userId);
            } catch {
                // A just-established session can briefly precede PostgREST's
                // authorization context. Retry once, then surface a real error.
                await new Promise((resolve) => setTimeout(resolve, 150));
                nextMembership = await getBusinessMembership(userId);
            }

            if (requestId !== requestIdRef.current) return;

            if (!nextMembership) {
                setMembership(null);
                setBusiness(null);
                setSettings(null);
                setLoadedUserId(userId);
                loadedUserIdRef.current = userId;
                return;
            }

            const [nextBusiness, nextSettings] = await Promise.all([
                getBusinessById(nextMembership.business_id),
                getBusinessSettingsById(nextMembership.business_id),
            ]);

            if (requestId !== requestIdRef.current) return;

            setMembership(nextMembership);
            setBusiness(nextBusiness);
            setSettings(nextSettings);
            setLoadedUserId(userId);
            loadedUserIdRef.current = userId;
        } catch (cause) {
            if (requestId !== requestIdRef.current) return;

            if (isBootstrap) {
                setMembership(null);
                setBusiness(null);
                setSettings(null);
                setLoadedUserId(userId);
                loadedUserIdRef.current = userId;
                setError(
                    cause instanceof Error
                        ? cause
                        : new Error('Unable to load your business.')
                );
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [userId]);

    useEffect(() => {
        requestIdRef.current += 1;
        setBusiness(null);
        setMembership(null);
        setSettings(null);
        setError(null);
        setLoadedUserId(null);
        loadedUserIdRef.current = null;
        setLoading(Boolean(userId));
    }, [userId]);

    useEffect(() => {
        if (!initialized || authLoading || authError || (userId && !profileId)) return;
        void loadBusiness();
    }, [initialized, authLoading, authError, loadBusiness, profileId, userId]);

    const refresh = useCallback(async () => {
        if (authError || (userId && !profileId)) {
            await refreshProfile();
            return;
        }

        await loadBusiness();
    }, [authError, loadBusiness, profileId, refreshProfile, userId]);

    const currentUserLoaded = Boolean(authError) || !userId || loadedUserId === userId;
    const value = useMemo<BusinessContextValue>(() => ({
        business: currentUserLoaded ? business : null,
        membership: currentUserLoaded ? membership : null,
        settings: currentUserLoaded ? settings : null,
        loading: authError ? false : loading || !currentUserLoaded,
        error: currentUserLoaded ? (authError ?? error) : null,
        refresh,
    }), [
        authError,
        business,
        currentUserLoaded,
        error,
        loading,
        membership,
        refresh,
        settings,
    ]);

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness(): BusinessContextValue {
    const context = useContext(BusinessContext);

    if (!context) {
        throw new Error('useBusiness must be used within BusinessProvider');
    }

    return context;
}
