"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Scissors } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { getAppointmentTemporalState } from "@/features/appointments/utils/appointment-temporal";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import type {
  StaffDetailData,
  StaffWithOperations,
} from "../services/staff.service";

export function StaffDetail({
  staff,
  detail,
  loading,
  error,
  onBack,
  onEdit,
  onRetry,
}: {
  staff: StaffWithOperations;
  detail: StaffDetailData | null;
  loading: boolean;
  error: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRetry: () => void;
}) {
  if (loading && !detail)
    return (
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Loading staff profile"
      >
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  if (error && !detail)
    return (
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <h1 className="text-xl font-semibold">
            Unable to load staff operations
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Existing staff data has not been replaced.
          </p>
          <Button className="mt-5" onClick={onRetry}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  if (!detail) return null;

  const classified = detail.appointments.map((appointment) => ({
    appointment,
    temporal: getAppointmentTemporalState(
      appointment,
      detail.clock.business_date,
      detail.clock.business_time,
    ),
  }));
  const today = classified
    .filter(
      ({ appointment }) =>
        appointment.appointment_date === detail.clock.business_date,
    )
    .reverse();
  const upcoming = classified
    .filter(
      ({ appointment, temporal }) =>
        temporal === "upcoming" &&
        (appointment.status === "pending" || appointment.status === "scheduled" ||
          appointment.status === "confirmed"),
    )
    .reverse();
  const history = classified.filter(
    ({ appointment, temporal }) =>
      temporal === "past" ||
      ["completed", "cancelled", "no_show"].includes(appointment.status),
  );
  const assigned = staff.staff_services.map((item) => item.services);
  const specificHours = detail.workingHours.filter(
    (row) => row.staff_id === staff.id,
  );
  const hours = specificHours.length
    ? specificHours
    : detail.workingHours.filter((row) => row.staff_id === null);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to staff
      </Button>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={staff.avatar_url} alt={staff.full_name} />
            <AvatarFallback className="bg-primary/15 font-semibold text-primary">
              {getInitials(staff.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Staff operations
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{staff.full_name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={staff.status === "active" ? "default" : "secondary"}
              >
                {staff.status}
              </Badge>
              {staff.role && (
                <span className="text-sm text-muted-foreground">
                  {staff.role}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit staff
        </Button>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.6fr)]">
        <div className="space-y-6">
          <AppointmentSection
            title="Today's schedule"
            items={today}
            empty="No appointments scheduled today."
          />
          <AppointmentSection
            title="Upcoming appointments"
            items={upcoming.slice(0, 10)}
            empty="No upcoming appointments."
          />
          <AppointmentSection
            title="Recent history"
            items={history.slice(0, 10)}
            empty="No appointment history yet."
          />
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned services</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {assigned.length ? (
                assigned.map((service) => (
                  <Badge key={service.id} variant="secondary">
                    <Scissors className="mr-1 h-3 w-3" />
                    {service.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No services assigned.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule context</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {specificHours.length
                  ? "Staff-specific hours"
                  : "Business hours apply"}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                {hours.map((row) => (
                  <div
                    key={row.day_of_week}
                    className="flex justify-between gap-3"
                  >
                    <dt>{DAYS[row.day_of_week]}</dt>
                    <dd className="tabular-nums text-muted-foreground">
                      {row.is_open && row.open_time && row.close_time
                        ? `${formatTime(row.open_time)}–${formatTime(row.close_time)}`
                        : "Closed"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time off</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.timeOff.length ? (
                detail.timeOff.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">
                      {entry.reason || "Time off"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatZoned(entry.start_at, detail.clock.timezone)} –{" "}
                      {formatZoned(entry.end_at, detail.clock.timezone)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No current or upcoming time off.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AppointmentSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{
    appointment: StaffDetailData["appointments"][number];
    temporal: string;
  }>;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="divide-y" role="list">
            {items.map(({ appointment, temporal }) => (
              <div
                key={appointment.id}
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
                  <p className="truncate text-sm font-medium">
                    {appointment.services.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {appointment.customers.full_name}
                    {temporal === "in-progress" ? " · In progress now" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={appointment.status} />
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/dashboard/appointments?appointment=${appointment.id}`}
                    >
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatZoned(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
