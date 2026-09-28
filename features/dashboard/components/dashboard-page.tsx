"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Scissors,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubscriptionStatusCard } from "@/features/subscriptions/components/subscription-status-card";
import { useBusinessCurrency } from "@/features/business/hooks/use-business-currency";
import { useAuth } from "@/providers/auth-provider";
import { useBusiness } from "@/providers/business-provider";
import { formatTime } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  DashboardBusinessClock,
} from "@/types/database";
import {
  getDashboardData,
  updateAppointmentStatus,
} from "../services/dashboard.service";
import {
  getGreeting,
  getNextOperationalAppointment,
  getTodayStatusCounts,
} from "../utils/dashboard-operations";
import { getAppointmentTemporalState } from "@/features/appointments/utils/appointment-temporal";
import { toast } from "sonner";

type DashboardState = {
  clock: DashboardBusinessClock;
  today: AppointmentWithRelations[];
  upcoming: AppointmentWithRelations[];
  snapshot: { customers: number; services: number; staff: number };
};

function formatBusinessDate(
  value: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...(options ?? {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  }).format(new Date(`${value}T12:00:00Z`));
}

export function DashboardPage() {
  const { profile } = useAuth();
  const { business } = useBusiness();
  const { format: formatCurrency } = useBusinessCurrency();
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const requestRef = useRef(0);

  const load = useCallback(
    async (background = false) => {
      if (!business?.id) return;
      const request = ++requestRef.current;
      if (!background) setLoading(true);
      setError(false);
      try {
        const next = await getDashboardData(business.id);
        if (request === requestRef.current) setData(next);
      } catch {
        if (request === requestRef.current) setError(true);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [business?.id],
  );

  useEffect(() => {
    void load();
    const refresh = () => void load(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      requestRef.current += 1;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const counts = useMemo(
    () => getTodayStatusCounts(data?.today ?? []),
    [data?.today],
  );
  const nextUp = useMemo(
    () => getNextOperationalAppointment(data?.upcoming ?? []),
    [data?.upcoming],
  );
  const currentHour = Number(data?.clock.business_time?.slice(0, 2) ?? 12);

  const changeStatus = async (
    appointment: AppointmentWithRelations,
    status: "confirmed" | "completed" | "cancelled",
  ) => {
    if (!business?.id || pendingIds.has(appointment.id)) return;
    setPendingIds((current) => new Set(current).add(appointment.id));
    const result = await updateAppointmentStatus(
      business.id,
      appointment.id,
      status,
    );
    if (result.error) toast.error("Unable to update this appointment.");
    else {
      toast.success(`Appointment marked ${status}.`);
      await load(true);
    }
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(appointment.id);
      return next;
    });
  };

  if (loading && !data) return <DashboardLoading />;
  if (error && !data) return <DashboardError onRetry={() => void load()} />;
  if (!data) return null;

  const name = profile?.full_name?.trim().split(/\s+/)[0];
  const firstUpcoming = data.upcoming.slice(nextUp ? 1 : 0, 6);
  const metrics = [
    ["Today", counts.total],
    ["Confirmed", counts.confirmed],
    ["Pending", counts.pending],
    ["Completed", counts.completed],
    ["Cancelled", counts.cancelled],
  ];

  return (
    <motion.main
      className="space-y-6"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{business?.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {getGreeting(currentHour)}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Today · {formatBusinessDate(data.clock.business_date)} ·{" "}
            {data.clock.timezone}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Open calendar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/appointments?new=true">
              <Plus className="mr-2 h-4 w-4" />
              New appointment
            </Link>
          </Button>
        </div>
      </header>

      <SubscriptionStatusCard compact />

      <section aria-labelledby="today-glance-title">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="today-glance-title"
            className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Today at a glance
          </h2>
          {error && (
            <button
              onClick={() => void load(true)}
              className="inline-flex items-center gap-1 text-xs text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh failed
            </button>
          )}
        </div>
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-5">
          {metrics.map(([label, value], index) => (
            <div
              key={String(label)}
              className={`p-4 sm:p-5 ${index > 0 ? "border-l" : ""} ${index > 1 ? "max-sm:border-t" : ""}`}
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {counts.total
                  ? `${counts.total} appointment${counts.total === 1 ? "" : "s"} on the calendar`
                  : "Your calendar is clear"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/appointments">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.today.length === 0 ? (
              <EmptyDay />
            ) : (
              <div
                className="divide-y"
                role="list"
                aria-label="Today's appointments"
              >
                {data.today.map((appointment) => (
                  <ScheduleRow
                    key={appointment.id}
                    appointment={appointment}
                    busy={pendingIds.has(appointment.id)}
                    onStatus={changeStatus}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Next up
              </p>
              {nextUp ? (
                <>
                  {getAppointmentTemporalState(
                    nextUp,
                    data.clock.business_date,
                    data.clock.business_time,
                  ) === "in-progress" && (
                    <p className="mt-3 text-sm font-medium text-success">
                      In progress now
                    </p>
                  )}
                  <p className="mt-4 text-4xl font-semibold tabular-nums text-foreground">
                    {formatTime(nextUp.start_time)}
                  </p>
                  <h2 className="mt-4 text-lg font-semibold">
                    {nextUp.services.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextUp.customers.full_name}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Staff</dt>
                      <dd className="mt-1 font-medium">
                        {nextUp.staff?.full_name || "Any staff"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="mt-1 font-medium">
                        {nextUp.duration_snapshot || nextUp.services.duration}{" "}
                        min
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Date</dt>
                      <dd className="mt-1 font-medium">
                        {nextUp.appointment_date === data.clock.business_date
                          ? "Today"
                          : formatBusinessDate(nextUp.appointment_date, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="mt-1 font-medium tabular-nums">
                        {formatCurrency(
                          nextUp.price_snapshot ?? nextUp.services.price,
                        )}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="py-8">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="mt-3 font-medium">
                    No more appointments today.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You&apos;re all caught up.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Needs attention</CardTitle>
            </CardHeader>
            <CardContent>
              {counts.pending ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">
                      {counts.pending} appointment
                      {counts.pending === 1 ? "" : "s"} need confirmation
                    </p>
                    <Button asChild variant="link" className="mt-1 h-auto p-0">
                      <Link href="/dashboard/appointments">
                        Review appointments
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/calendar">
                Calendar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {firstUpcoming.length ? (
              <div className="divide-y">
                {firstUpcoming.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {formatBusinessDate(appointment.appointment_date, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatTime(appointment.start_time)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {appointment.services.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.customers.full_name}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                No upcoming appointments scheduled.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {[
                [Users, "Customers", data.snapshot.customers],
                [Scissors, "Active services", data.snapshot.services],
                [UserCog, "Active staff", data.snapshot.staff],
              ].map(([Icon, label, value]) => {
                const SnapshotIcon = Icon as typeof Users;
                return (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between"
                  >
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <SnapshotIcon className="h-4 w-4" />
                      {String(label)}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {String(value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}

function ScheduleRow({
  appointment,
  busy,
  onStatus,
}: {
  appointment: AppointmentWithRelations;
  busy: boolean;
  onStatus: (
    appointment: AppointmentWithRelations,
    status: "confirmed" | "completed" | "cancelled",
  ) => void;
}) {
  return (
    <div
      role="listitem"
      className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto] sm:items-center"
    >
      <div>
        <p className="font-semibold tabular-nums">
          {formatTime(appointment.start_time)}
        </p>
        <p className="text-xs text-muted-foreground">
          {appointment.duration_snapshot || appointment.services.duration} min
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{appointment.services.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {appointment.customers.full_name} ·{" "}
          {appointment.staff?.full_name || "Any staff"}
        </p>
      </div>
      <StatusBadge status={appointment.status} className="mt-2 w-fit sm:mt-0" />
      <div
        className="col-span-2 flex gap-1 sm:col-span-1"
        aria-label={`Actions for ${appointment.customers.full_name}`}
      >
        {(appointment.status === "pending" || appointment.status === "scheduled") && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onStatus(appointment, "confirmed")}
          >
            <Check className="mr-1 h-4 w-4" />
            Confirm
          </Button>
        )}
        {appointment.status === "confirmed" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onStatus(appointment, "completed")}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Complete
          </Button>
        )}
        {(appointment.status === "pending" || appointment.status === "scheduled" ||
          appointment.status === "confirmed") && (
          <Button
            size="icon"
            variant="ghost"
            disabled={busy}
            onClick={() => onStatus(appointment, "cancelled")}
            aria-label={`Cancel ${appointment.customers.full_name}'s appointment`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyDay() {
  return (
    <div className="py-10 text-center">
      <Calendar className="mx-auto h-9 w-9 text-muted-foreground/50" />
      <p className="mt-3 font-medium">Nothing scheduled today</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your calendar is clear.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button asChild size="sm">
          <Link href="/dashboard/appointments?new=true">
            <Plus className="mr-1 h-4 w-4" />
            Create appointment
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/calendar">Open calendar</Link>
        </Button>
      </div>
    </div>
  );
}
function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-9 w-9 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">
          Unable to load today&apos;s schedule
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your business data was not replaced with empty values. Try loading the
          dashboard again.
        </p>
        <Button onClick={onRetry} className="mt-5">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
