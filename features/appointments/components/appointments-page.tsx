'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppointmentsFilters } from './appointments-filters';
import { AppointmentsTable } from './appointments-table';
import { AppointmentFormDialog } from './appointment-form-dialog';
import { DeleteAppointmentDialog } from './delete-appointment-dialog';
import {
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  APPOINTMENTS_PAGE_SIZE,
} from '../services/appointments.service';
import { handleError } from '@/lib/errors/error-handler';
import { toast } from 'sonner';
import type { AppointmentWithRelations, Appointment } from '@/types/database';

export function AppointmentsPage() {
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditAppt(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count, error } = await getAppointments({
        page,
        status: statusFilter,
        search,
      });

      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load appointments' });
        setAppointments([]);
        return;
      }

      setAppointments(data as AppointmentWithRelations[] ?? []);
      setTotal(count ?? 0);
    } catch (error) {
      handleError(error, { fallbackMessage: 'Unexpected error while loading appointments.' });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const openForm = (appointment?: Appointment) => {
    setEditAppt(appointment ?? null);
    setFormOpen(true);
  };

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    const { error } = await updateAppointmentStatus(id, status);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Appointment marked as ${status}`);
    await fetchAppointments();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteAppointment(deleteId);
    if (error) {
      toast.error('Failed to delete appointment');
      return;
    }
    toast.success('Appointment deleted');
    setDeleteId(null);
    await fetchAppointments();
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
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        status={statusFilter}
        onStatusChange={(v) => { setStatusFilter(v); setPage(0); }}
      />

      <AppointmentsTable
        appointments={appointments}
        loading={loading}
        hasFilters={search !== '' || statusFilter !== 'all'}
        onEdit={openForm}
        onDelete={setDeleteId}
        onStatusChange={handleStatusChange}
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
        onOpenChange={setFormOpen}
        appointment={editAppt}
        onSaved={fetchAppointments}
      />
      <DeleteAppointmentDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
