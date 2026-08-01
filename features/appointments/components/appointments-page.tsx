'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppointmentFormDialog } from './appointment-form-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  APPOINTMENTS_PAGE_SIZE,
} from '../services/appointments.service';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import type { AppointmentWithRelations, Appointment } from '@/types/database';
import { toast } from 'sonner';

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
    const { data, count, error } = await getAppointments({
      page,
      status: statusFilter,
      search,
    });
    if (error) {
      toast.error('Failed to load appointments');
      setAppointments([]);
    } else {
      setAppointments((data as unknown as AppointmentWithRelations[]) || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    const { error } = await updateAppointmentStatus(id, status);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Appointment marked as ${status}`);
    fetchAppointments();
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
    fetchAppointments();
  };

  const totalPages = Math.ceil(total / APPOINTMENTS_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all your bookings in one place.</p>
        </div>
        <Button onClick={() => { setEditAppt(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New appointment
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer or service..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(0); }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No appointments found"
              description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first appointment to get started.'}
              action={{ label: 'New appointment', onClick: () => { setEditAppt(null); setFormOpen(true); } }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium text-foreground">{appt.customers.full_name}</div>
                        <div className="text-xs text-muted-foreground">{appt.customers.phone || appt.customers.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: appt.services.color || undefined }} />
                          <span className="text-sm text-foreground">{appt.services.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {appt.staff?.full_name || 'Any staff'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{formatDate(appt.appointment_date)}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(appt.start_time)}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {formatCurrency(appt.services.price)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={appt.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {appt.status === 'pending' && (
                            <>
                              <button onClick={() => handleStatusChange(appt.id, 'confirmed')} className="rounded p-1.5 text-primary hover:bg-primary/10" title="Confirm">
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleStatusChange(appt.id, 'completed')} className="rounded p-1.5 text-success hover:bg-success/10" title="Complete">
                                <Clock className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleStatusChange(appt.id, 'cancelled')} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Cancel">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button onClick={() => { setEditAppt(appt); setFormOpen(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(appt.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * APPOINTMENTS_PAGE_SIZE + 1}–{Math.min((page + 1) * APPOINTMENTS_PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AppointmentFormDialog open={formOpen} onOpenChange={setFormOpen} appointment={editAppt} onSaved={fetchAppointments} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete appointment?"
        description="This action cannot be undone. The appointment will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
