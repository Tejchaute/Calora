'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersFilters } from './customers-filters';
import { CustomersTable } from './customers-table';
import { CustomerDetail } from './customer-detail';
import { CustomerFormDialog } from './customer-form-dialog';
import {
  CUSTOMERS_PAGE_SIZE,
  getCustomerDetail,
  getCustomerAppointments,
  getCustomers,
  type CustomerDetailData,
  type CustomerWithIntelligence,
} from '../services/customers.service';
import { handleError } from '@/lib/errors/error-handler';
import { useBusiness } from '@/providers/business-provider';
import { useBusinessCurrency } from '@/features/business/hooks/use-business-currency';
import type { Customer } from '@/types/database';

export function CustomersPage() {
  const { business, loading: businessLoading } = useBusiness();
  const { format: formatBusinessCurrency } = useBusinessCurrency();
  const [customers, setCustomers] = useState<CustomerWithIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    if (!business?.id) {
      setCustomers([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    if (!hasLoadedRef.current) setLoading(true);
    setLoadError(false);
    try {
      const { data, count, error } = await getCustomers(business.id, {
        page,
        search: debouncedSearch,
      });
      if (requestId !== requestIdRef.current) return;
      if (error) throw error;
      setCustomers(data ?? []);
      setTotal(count ?? 0);
    } catch (error) {
      setLoadError(true);
      handleError(error, { fallbackMessage: 'Failed to load customers' });
    } finally {
      if (requestId === requestIdRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }
  }, [business?.id, page, debouncedSearch]);

  useEffect(() => {
    if (!businessLoading) void fetchCustomers();
    return () => {
      requestIdRef.current += 1;
    };
  }, [businessLoading, fetchCustomers]);

  const loadDetail = useCallback(
    async (customer: Customer) => {
      if (!business?.id) return;
      setDetailCustomer(customer);
      setDetailLoading(true);
      setLoadingMore(false);
      setDetailError(false);
      const requestId = ++detailRequestIdRef.current;
      try {
        const result = await getCustomerDetail(business.id, customer.id);
        if (requestId !== detailRequestIdRef.current) return;
        if (result.error || !result.data) throw result.error;
        setDetail(result.data);
      } catch (error) {
        setDetailError(true);
        handleError(error, {
          fallbackMessage: 'Failed to load customer history',
        });
      } finally {
        if (requestId === detailRequestIdRef.current) setDetailLoading(false);
      }
    },
    [business?.id],
  );

  const openForm = (customer?: Customer) => {
    setEditCustomer(customer ?? null);
    setFormOpen(true);
  };

  if (detailCustomer) {
    return (
      <>
        <CustomerDetail
          customer={detailCustomer}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onBack={() => {
            detailRequestIdRef.current += 1;
            setDetailCustomer(null);
            setDetail(null);
            setLoadingMore(false);
          }}
          onEdit={() => openForm(detailCustomer)}
          onRetry={() => void loadDetail(detailCustomer)}
          onLoadMore={() => {
            if (!business?.id || !detail || loadingMore) return;
            const customerId = detailCustomer.id;
            const requestId = detailRequestIdRef.current;
            setLoadingMore(true);
            void getCustomerAppointments(business.id, customerId, detail.historyCount)
              .then(({ data, error }) => {
                if (requestId !== detailRequestIdRef.current) return;
                if (error) throw error;
                setDetail((current) => current?.customerId === customerId ? {
                  ...current,
                  appointments: [...current.appointments, ...(data ?? []).filter(
                    (appointment) => !current.appointments.some((existing) => existing.id === appointment.id),
                  )],
                  historyCount: current.historyCount + (data?.length ?? 0),
                } : current);
              })
              .catch((error) => handleError(error, { fallbackMessage: 'Failed to load more appointments' }))
              .finally(() => {
                if (requestId === detailRequestIdRef.current) setLoadingMore(false);
              });
          }}
          loadingMore={loadingMore}
          formatCurrency={formatBusinessCurrency}
        />
        <CustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={editCustomer}
          onSuccess={async () => {
            await fetchCustomers();
            await loadDetail(detailCustomer);
          }}
        />
      </>
    );
  }

  const totalPages = Math.ceil(total / CUSTOMERS_PAGE_SIZE);
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Customers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand each customer&apos;s appointment relationship with your
            business.
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add customer
        </Button>
      </header>

      <CustomersFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
      />

      {loadError && !loading ? (
        <div className="rounded-xl border border-destructive/30 p-6 text-center">
          <p className="font-medium">Unable to load customers</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void fetchCustomers()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <CustomersTable
          customers={customers}
          loading={loading}
          hasFilters={search !== ''}
          onEdit={openForm}
          onRowClick={(customer) => void loadDetail(customer)}
          onCreate={() => openForm()}
        />
      )}

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {page * CUSTOMERS_PAGE_SIZE + 1}–
            {Math.min((page + 1) * CUSTOMERS_PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((value) => Math.min(totalPages - 1, value + 1))
              }
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editCustomer}
        onSuccess={fetchCustomers}
      />
    </div>
  );
}
