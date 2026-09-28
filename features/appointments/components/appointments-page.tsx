'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppointmentsFilters } from './appointments-filters';
import { AppointmentsTable } from './appointments-table';
import { AppointmentFormDialog } from './appointment-form-dialog';
import {
  getAppointments,
  updateAppointmentStatus,
  APPOINTMENTS_PAGE_SIZE,
  type AppointmentView,
} from '../services/appointments.service';
import { handleError } from '@/lib/errors/error-handler';
import { toast } from 'sonner';
import type { AppointmentWithRelations, Appointment } from '@/types/database';
import { useBusiness } from '@/features/business/hooks/use-business';

export function AppointmentsPage() {
  const searchParams = useSearchParams();
  const { business } = useBusiness();
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<AppointmentView>('active');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditAppt(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const fetchAppointments = useCallback(async () => {
    if (!business?.id) {
      return;
    }
    const requestId = ++requestIdRef.current;
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const { data, count, error } = await getAppointments({
        businessId: business.id,
        page,
        status: statusFilter,
        search: debouncedSearch,
        view,
      });

      if (requestId !== requestIdRef.current) return;

      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load appointments' });
        setAppointments([]);
        return;
      }

      setAppointments((data as AppointmentWithRelations[]) ?? []);
      setTotal(count ?? 0);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Unexpected error while loading appointments.',
      });
      setAppointments([]);
    } finally {
      if (requestId === requestIdRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }
  }, [business?.id, statusFilter, debouncedSearch, page, view]);

  useEffect(() => {
    void fetchAppointments();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchAppointments]);

  const openForm = (appointment?: Appointment) => {
    setEditAppt(appointment ?? null);
    setFormOpen(true);
  };

  const handleStatusChange = async (
    id: string,
    status: Appointment['status'],
  ) => {
    if (!business?.id || pendingIds.has(id)) return;

    setPendingIds((current) => new Set(current).add(id));

    const { error } = await updateAppointmentStatus(business.id, id, status);

    if (error) {
      toast.error('Failed to update status');
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return;
    }
    toast.success(`Appointment marked as ${status}`);
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };


  const totalPages = Math.ceil(total / APPOINTMENTS_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all your bookings in one place.
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          New appointment
        </Button>
      </div>

      <AppointmentsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        status={statusFilter}
        view={view}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(0);
        }}
      />

      <div
        className="inline-flex rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Appointment view"
      >
        {(['active', 'history'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => {
              setView(option);
              setStatusFilter('all');
              setPage(0);
            }}
            className={`min-h-9 rounded-md px-4 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {option}
          </button>
        ))}
      </div>

      <AppointmentsTable
        appointments={appointments}
        loading={loading}
        hasFilters={search !== '' || statusFilter !== 'all'}
        view={view}
        onEdit={openForm}
        onStatusChange={handleStatusChange}
        pendingIds={pendingIds}
        onCreate={() => openForm()}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * APPOINTMENTS_PAGE_SIZE + 1}–
            {Math.min((page + 1) * APPOINTMENTS_PAGE_SIZE, total)} of {total}
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

      <AppointmentFormDialog
        open={formOpen}
        businessId={business?.id}
        onOpenChange={setFormOpen}
        appointment={editAppt}
        onSaved={fetchAppointments}
      />
    </div>
  );
}
