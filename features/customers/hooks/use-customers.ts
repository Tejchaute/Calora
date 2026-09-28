'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBusiness } from '@/features/business/hooks/use-business';
import type { Customer } from '@/types/database';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
} from '../services/customers.service';
import { handleError } from '@/lib/errors/error-handler';

type CustomerPayload = Partial<
  Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at'>
>;

export function useCustomers() {
  const { business, loading: businessLoading } = useBusiness();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchCustomers = useCallback(async () => {
    if (!business?.id) {
      setCustomers([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, count, error } = await getCustomers(business.id, {
        page,
        search,
      });

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to load customers',
        });
        return;
      }

      setCustomers(data ?? []);
      setTotal(count ?? 0);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Unexpected error while loading customers.',
      });
    } finally {
      setLoading(false);
    }
  }, [business?.id, page, search]);

  useEffect(() => {
    if (!businessLoading) {
      fetchCustomers();
    }
  }, [businessLoading, fetchCustomers]);

  const addCustomer = useCallback(
    async (payload: CustomerPayload) => {
      if (!business?.id) {
        throw new Error('Business not loaded.');
      }

      const result = await createCustomer(business.id, payload);

      if (!result.error) {
        await fetchCustomers();
      }

      return result;
    },
    [business?.id, fetchCustomers],
  );

  const editCustomer = useCallback(
    async (id: string, payload: CustomerPayload) => {
      if (!business?.id) {
        throw new Error('Business not loaded.');
      }

      const result = await updateCustomer(business.id, id, payload);

      if (!result.error) {
        await fetchCustomers();
      }

      return result;
    },
    [business?.id, fetchCustomers],
  );

  return {
    customers,
    loading: loading || businessLoading,
    search,
    setSearch,
    page,
    setPage,
    total,
    refresh: fetchCustomers,
    addCustomer,
    editCustomer,
    business,
  };
}
