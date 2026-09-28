'use client';

import {
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatTime } from '@/lib/utils';
import type { AppointmentWithRelations, Appointment } from '@/types/database';
import { useBusinessCurrency } from '@/features/business/hooks/use-business-currency';
import type { AppointmentView } from '../services/appointments.service';

interface AppointmentsTableProps {
  appointments: AppointmentWithRelations[];
  loading: boolean;
  hasFilters: boolean;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (id: string, status: Appointment['status']) => void;
  pendingIds: Set<string>;
  onCreate: () => void;
  view: AppointmentView;
}

export function AppointmentsTable({
  appointments,
  loading,
  hasFilters,
  onEdit,
  onStatusChange,
  pendingIds,
  onCreate,
  view,
}: AppointmentsTableProps) {
  const { format: formatBusinessCurrency } = useBusinessCurrency();
  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="No appointments found"
        description={
          hasFilters
            ? 'Try adjusting your filters.'
            : view === 'active'
              ? 'No active appointments. Past and completed bookings remain available in History.'
              : 'No appointment history yet.'
        }
        action={
          view === 'active'
            ? { label: 'New appointment', onClick: onCreate }
            : undefined
        }
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
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
                    <div className="font-medium text-foreground">
                      {appt.customers?.full_name ?? 'Unknown Customer'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {appt.customers.phone || appt.customers.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">
                        {appt.services?.name ?? 'Unknown Service'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {appt.staff?.full_name || 'Any staff'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(appt.appointment_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(appt.start_time)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {formatBusinessCurrency(
                      appt.price_snapshot ?? appt.services?.price ?? 0,
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={appt.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {(appt.status === 'pending' || appt.status === 'scheduled') && (
                        <>
                          <button
                            onClick={() => onStatusChange(appt.id, 'confirmed')}
                            disabled={pendingIds.has(appt.id)}
                            aria-label={`Confirm ${appt.customers?.full_name ?? 'customer'} appointment`}
                            className="rounded p-1.5 text-primary hover:bg-primary/10"
                            title="Confirm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onStatusChange(appt.id, 'completed')}
                            disabled={pendingIds.has(appt.id)}
                            aria-label={`Complete ${appt.customers?.full_name ?? 'customer'} appointment`}
                            className="rounded p-1.5 text-success hover:bg-success/10"
                            title="Complete"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onStatusChange(appt.id, 'cancelled')}
                            disabled={pendingIds.has(appt.id)}
                            aria-label={`Cancel ${appt.customers?.full_name ?? 'customer'} appointment`}
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                            title="Cancel"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onEdit(appt)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
