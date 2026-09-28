'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit,
  History,
  Mail,
  Phone,
  Plus,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { getAppointmentTemporalState } from '@/features/appointments/utils/appointment-temporal';
import { formatDate, formatTime, getInitials } from '@/lib/utils';
import type { Customer } from '@/types/database';
import type { CustomerDetailData } from '../services/customers.service';

interface CustomerDetailProps {
  customer: Customer;
  detail: CustomerDetailData | null;
  loading: boolean;
  error: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  formatCurrency: (value: number) => string;
}

export function CustomerDetail({
  customer,
  detail,
  loading,
  error,
  onBack,
  onEdit,
  onRetry,
  onLoadMore,
  loadingMore,
  formatCurrency,
}: CustomerDetailProps) {
  if (loading && !detail) return <CustomerDetailLoading />;
  if (error && !detail) {
    return (
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <h1 className="text-xl font-semibold">
            Unable to load customer history
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The customer record was not replaced with empty data.
          </p>
          <Button className="mt-5" onClick={onRetry}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (!detail) return null;

  const classified = detail.appointments.map((appointment) => ({
    appointment,
    temporal: getAppointmentTemporalState(
      appointment,
      detail.clock.business_date,
      detail.clock.business_time,
    ),
  }));
  const inProgress = classified.filter(
    ({ appointment, temporal }) =>
      temporal === 'in-progress' &&
      (appointment.status === 'pending' || appointment.status === 'scheduled' || appointment.status === 'confirmed'),
  );
  const upcoming = classified
    .filter(
      ({ appointment, temporal }) =>
        temporal === 'upcoming' &&
        (appointment.status === 'pending' || appointment.status === 'scheduled' ||
          appointment.status === 'confirmed'),
    )
    .reverse();
  const history = classified.filter(
    ({ appointment, temporal }) =>
      temporal === 'past' ||
      appointment.status === 'completed' ||
      appointment.status === 'cancelled' ||
      appointment.status === 'no_show',
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to customers
      </Button>

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/15 font-semibold text-primary">
              {getInitials(customer.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Customer profile
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold">
              {customer.full_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button asChild>
            <Link href="/dashboard/appointments?new=true">
              <Plus className="mr-2 h-4 w-4" />
              New appointment
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <div className="space-y-6">
          {(inProgress.length > 0 || upcoming.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming care</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inProgress.map(({ appointment }) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    label="In progress now"
                    formatCurrency={formatCurrency}
                  />
                ))}
                {upcoming.slice(0, 5).map(({ appointment }, index) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    label={index === 0 ? 'Next appointment' : undefined}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length ? (
                <div
                  className="divide-y"
                  role="list"
                  aria-label="Customer appointment history"
                >
                  {history.map(({ appointment }) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No historical appointments yet.
                </div>
              )}
              {detail.historyCount < detail.summary.total && (
                <Button className="mt-4" variant="outline" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading history…' : `Load more appointments (${detail.historyCount} of ${detail.summary.total})`}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.events.length ? (
                <ol className="space-y-4">
                  {detail.events.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <div
                        className="mt-1 h-2 w-2 flex-none rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {eventLabel(event.event_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatEventTime(
                            event.occurred_at,
                            detail.clock.timezone,
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No lifecycle activity recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="break-all">
                  {customer.email || 'No email provided'}
                </span>
              </div>
              <div className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>{customer.phone || 'No phone provided'}</span>
              </div>
              {customer.notes && (
                <p className="border-t pt-3 text-muted-foreground">
                  {customer.notes}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <SummaryRow
                  icon={CalendarClock}
                  label="Total"
                  value={detail.summary.total}
                />
                <SummaryRow
                  icon={CheckCircle2}
                  label="Completed"
                  value={detail.summary.completed}
                />
                <SummaryRow
                  icon={History}
                  label="Cancelled"
                  value={detail.summary.cancelled}
                />
                <SummaryRow
                  icon={Clock3}
                  label="Upcoming"
                  value={detail.summary.operational}
                />
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AppointmentRow({
  appointment,
  label,
  formatCurrency,
}: {
  appointment: CustomerDetailData['appointments'][number];
  label?: string;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div
      role="listitem"
      className="grid gap-2 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center"
    >
      <div>
        <p className="text-sm font-medium">
          {formatDate(appointment.appointment_date)}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatTime(appointment.start_time)}–
          {formatTime(appointment.end_time)}
        </p>
      </div>
      <div className="min-w-0">
        {label && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {label}
          </p>
        )}
        <p className="truncate text-sm font-medium">
          {appointment.services.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {appointment.staff?.full_name || 'Any staff'} ·{' '}
          {formatCurrency(
            appointment.price_snapshot ?? appointment.services.price,
          )}
        </p>
      </div>
      <StatusBadge status={appointment.status} className="w-fit" />
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function eventLabel(type: CustomerDetailData['events'][number]['event_type']) {
  return (
    {
      'appointment.created': 'Appointment booked',
      'appointment.confirmed': 'Appointment confirmed',
      'appointment.rescheduled': 'Appointment rescheduled',
      'appointment.cancelled': 'Appointment cancelled',
      'appointment.completed': 'Appointment completed',
    } as const
  )[type];
}

function formatEventTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function CustomerDetailLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading customer profile"
    >
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
