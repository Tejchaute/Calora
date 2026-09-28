'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Service } from '@/types/database';
import { useBusiness } from '@/features/business/hooks/use-business';
import {
    getServices,
    createService,
    updateService,
    deleteService,
} from '../services/services.service';

import { handleError } from '@/lib/errors/error-handler';

type ServicePayload = Partial<
    Omit<Service, 'id' | 'business_id' | 'created_at' | 'updated_at'>
>;

export function useServices() {
    const { business, loading: businessLoading } = useBusiness();

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const requestIdRef = useRef(0);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedSearch(search),
            250
        );
        return () => window.clearTimeout(timer);
    }, [search]);

    const fetchServices = useCallback(async () => {
        if (!business?.id) {
            setServices([]);
            setLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        if (!hasLoadedRef.current) setLoading(true);

        try {
            const { data, error } = await getServices(
                business.id,
                debouncedSearch
            );

            if (requestId !== requestIdRef.current) return;

            if (error) {
                handleError(error, {
                    fallbackMessage: 'Failed to load services',
                });
                return;
            }

            setServices(data ?? []);
        } catch (error) {
            handleError(error, {
                fallbackMessage: 'Failed to load services.',
            });
        } finally {
            if (requestId === requestIdRef.current) {
                hasLoadedRef.current = true;
                setLoading(false);
            }
        }
    }, [business?.id, debouncedSearch]);
    useEffect(() => {
        if (!businessLoading) {
            void fetchServices();
        }
        return () => {
            requestIdRef.current += 1;
        };
    }, [businessLoading, fetchServices]);

    const addService = useCallback(
        async (payload: ServicePayload) => {
            if (!business?.id) {
                throw new Error('Business not loaded.');
            }

            const result = await createService(
                business.id,
                payload
            );

            if (!result.error) {
                await fetchServices();
            }

            return result;
        },
        [business?.id, fetchServices]
    );

    const editService = useCallback(
        async (
            id: string,
            payload: ServicePayload
        ) => {
            if (!business?.id) {
                throw new Error('Business not loaded.');
            }

            const result = await updateService(
                business.id,
                id,
                payload
            );

            if (!result.error) {
                await fetchServices();
            }

            return result;
        },
        [business?.id, fetchServices]
    );

    const removeService = useCallback(
        async (id: string) => {
            if (!business?.id) {
                throw new Error('Business not loaded.');
            }

            const result = await deleteService(
                business.id,
                id
            );

            if (!result.error) {
                await fetchServices();
            }

            return result;
        },
        [business?.id, fetchServices]
    );

    return {
        services,
        loading: loading || businessLoading,
        search,
        setSearch,
        refresh: fetchServices,
        addService,
        editService,
        removeService,
        business,
    };
}
