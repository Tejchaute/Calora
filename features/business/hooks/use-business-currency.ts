'use client';

import { useCallback } from 'react';

import { formatCurrency } from '@/lib/utils';
import { useBusiness } from '@/providers/business-provider';

export function useBusinessCurrency() {
    const { settings } = useBusiness();
    const currency = settings?.currency || 'USD';

    const format = useCallback(
        (amount: number) => formatCurrency(amount, currency),
        [currency]
    );

    return { currency, format };
}
