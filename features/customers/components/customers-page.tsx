'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Edit,
  ArrowLeft,
  Phone,
  Mail,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/status-badge';
import { CustomersFilters } from './customers-filters';
import { CustomersTable } from './customers-table';
import { CustomerFormDialog } from './customer-form-dialog';
import { DeleteCustomerDialog } from './delete-customer-dialog';
import {
  getCustomers,
  deleteCustomer,
  getCustomerAppointments,
  CUSTOMERS_PAGE_SIZE,
} from '../services/customers.service';
import { getInitials, formatDate, formatTime, formatCurrency } from '@/lib/utils';
import type { Customer, AppointmentWithRelations } from '@/types/database';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [customerAppts, setCustomerAppts] = useState<AppointmentWithRelations[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count, error } = await getCustomers({ page, search });

      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load customers' });
        return;
      }

      setCustomers(data ?? []);
      setTotal(count ?? 0);
    } catch (error) {
      handleError(error, { fallbackMessage: 'Unexpected error while loading customers.' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openForm = (customer?: Customer) => {
    setEditCustomer(customer ?? null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteCustomer(deleteId);
    if (error) {
      handleError(error, { fallbackMessage: 'Failed to delete customer' });
      return;
    }
    toast.success('Customer deleted');
    setDeleteId(null);
    await fetchCustomers();
  };

  const openDetail = async (customer: Customer) => {
    setDetailCustomer(customer);
    setDetailLoading(true);

    try {
      const { data, error } = await getCustomerAppointments(customer.id);

      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load customer history' });
        return;
      }

      setCustomerAppts((data as AppointmentWithRelations[]) ?? []);
    } catch (error) {
      handleError(error, { fallbackMessage: 'Unexpected error while loading customer history' });
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / CUSTOMERS_PAGE_SIZE);

  if (detailCustomer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setDetailCustomer(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to customers
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                  {getInitials(detailCustomer.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{detailCustomer.full_name}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {detailCustomer.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {detailCustomer.email}
                    </div>
                  )}
                  {detailCustomer.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {detailCustomer.phone}
                    </div>
                  )}
                </div>
                {detailCustomer.notes && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {detailCustomer.notes}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  openForm(detailCustomer);
                  setDetailCustomer(null);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Booking History</CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : customerAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: appt.services.color || undefined }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{appt.services.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(appt.appointment_date)} at {formatTime(appt.start_time)} •{' '}
                        {appt.staff?.full_name || 'Any staff'}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {formatCurrency(appt.services.price)}
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your customer database.</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add customer
        </Button>
      </div>

      <CustomersFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
      />

      <CustomersTable
        customers={customers}
        loading={loading}
        hasFilters={search !== ''}
        onEdit={openForm}
        onDelete={setDeleteId}
        onRowClick={openDetail}
        onCreate={() => openForm()}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * CUSTOMERS_PAGE_SIZE + 1}–
            {Math.min((page + 1) * CUSTOMERS_PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
      <DeleteCustomerDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
