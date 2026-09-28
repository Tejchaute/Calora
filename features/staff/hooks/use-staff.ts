'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
    StaffWithServices,
} from '@/types/database';

import { useBusiness } from '@/features/business/hooks/use-business';

import {
    getStaff,
    createStaff,
    updateStaff,
    deleteStaff,
} from '../services/staff.service';

import { handleError } from '@/lib/errors/error-handler';

type StaffPayload = Partial<
    Omit<StaffWithServices, 'id' | 'created_at' | 'updated_at' | 'staff_services'>
>;

export function useStaff() {
    const {
        business,
        loading: businessLoading,
    } = useBusiness();

    const [staff, setStaff] = useState<StaffWithServices[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchStaff = useCallback(async () => {
        if (!business?.id) {
            setStaff([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await getStaff(
                business.id,
                search
            );

            if (error) {
                handleError(error, {
                    fallbackMessage: 'Failed to load staff.',
                });
                return;
            }

            setStaff(
                (data ?? []) as StaffWithServices[]
            );
        } catch (error) {
            handleError(error, {
                fallbackMessage: 'Failed to load staff.',
            });
        } finally {
            setLoading(false);
        }
    }, [business?.id, search]);

    useEffect(() => {
        if (!businessLoading) {
            fetchStaff();
        }
    }, [
        businessLoading,
        fetchStaff,
    ]);

    const addStaff = useCallback(
        async (
            payload: StaffPayload,
            serviceIds: string[]
        ) => {
            if (!business?.id) {
                throw new Error('Business not loaded.');
            }

            const result = await createStaff(
                business.id,
                payload,
                serviceIds
            );

            if (!result.error) {
                await fetchStaff();
            }

            return result;
        },
        [
            business?.id,
            fetchStaff,
        ]
    );

    const editStaff = useCallback(
        async (
            id: string,
            payload: StaffPayload,
            serviceIds?: string[]
        ) => {
            if (!business?.id) {
                throw new Error('Business not loaded.');
            }

            const result = await updateStaff(
                business.id,
                id,
                payload,
                serviceIds
            );

            if (!result.error) {
                await fetchStaff();
            }

            return result;
        },
        [
            business?.id,
            fetchStaff,
        ]
    );

    const removeStaff = useCallback(
        async (id: string) => {
            if (!business?.id) {
                throw new Error('Business not loaded.');
            }

            const result = await deleteStaff(
                business.id,
                id
            );

            if (!result.error) {
                await fetchStaff();
            }

            return result;
        },
        [
            business?.id,
            fetchStaff,
        ]
    );

    return {
        staff,
        loading: loading || businessLoading,
        search,
        setSearch,
        refresh: fetchStaff,
        addStaff,
        editStaff,
        removeStaff,
        business,
    };
}