"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, CalendarRange, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/providers/business-provider";
import { handleError } from "@/lib/errors/error-handler";
import { getBusinessAnalytics } from "../services/analytics.service";
import type {
  AnalyticsCountGroup,
  AnalyticsRangeDays,
  BusinessAnalytics,
} from "../types/analytics.types";
import { getAnalyticsSummary } from "../utils/analytics-metrics";

const RANGES: Array<{ value: AnalyticsRangeDays; label: string }> = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const AnalyticsTrendChart = dynamic(
  () => import("./analytics-trend-chart").then((module) => module.AnalyticsTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[25rem] w-full" /> },
);

export function AnalyticsPage() {
  const { business, loading: businessLoading } = useBusiness();
  const [days, setDays] = useState<AnalyticsRangeDays>(30);
  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!business?.id) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const result = await getBusinessAnalytics(business.id, days);
      if (id !== requestId.current) return;
      if (result.error || !result.data) throw result.error;
      setData(result.data);
    } catch (loadError) {
      if (id !== requestId.current) return;
      setError(true);
      handleError(loadError, { fallbackMessage: "Unable to load analytics" });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [business?.id, days]);

  useEffect(() => {
    if (!businessLoading && business?.id) void load();
    return () => {
      requestId.current += 1;
    };
  }, [businessLoading, business?.id, load]);

  if (businessLoading || (loading && !data)) return <AnalyticsLoading />;
  if (error && !data) return <AnalyticsError onRetry={() => void load()} />;
  if (!data) return null;

  const summary = getAnalyticsSummary(data);
  const hasAppointments = data.appointments.total > 0;

  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Business insights
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Appointment patterns based on persisted business data. Reporting
            days use {data.clock.timezone}.
          </p>
        </div>
        <div
          className="inline-flex w-full rounded-lg border bg-muted/40 p-1 sm:w-auto"
          aria-label="Analytics time range"
        >
          {RANGES.map((range) => (
            <Button
              key={range.value}
              type="button"
              size="sm"
              variant={days === range.value ? "default" : "ghost"}
              aria-pressed={days === range.value}
              disabled={loading}
              className="flex-1 sm:flex-none"
              onClick={() => setDays(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </header>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {formatDateOnly(data.range.start_date)}–
        {formatDateOnly(data.range.end_date)} · Updated from current persisted
        data
      </p>

      <section aria-labelledby="analytics-overview">
        <h2 id="analytics-overview" className="sr-only">
          Appointment overview
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Scheduled appointments"
            value={data.appointments.total}
            help="Appointments dated inside the selected period, including today."
          />
          <MetricCard
            label="Completed outcomes"
            value={data.outcomes.completed}
            help="Ended appointments currently marked completed."
          />
          <MetricCard
            label="Cancellation rate"
            value={formatRate(summary.cancellationRate)}
            help="Cancelled appointments divided by all appointments that have ended."
          />
          <MetricCard
            label="Customers with appointments"
            value={data.customers.with_appointments}
            help="Distinct customers scheduled in the selected period."
          />
        </dl>
      </section>

      {!hasAppointments ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CalendarRange className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-4 font-semibold">
              Not enough appointment data yet
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              This period contains no appointments. Choose a longer range or
              return after appointments have been scheduled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.65fr)]">
          <AnalyticsTrendChart data={data} />
          <StatusCard data={data} />
        </div>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Appointments by service"
          description="Scheduled appointment count, not revenue or service performance."
          rows={data.services}
          empty="No service appointment data in this period."
        />
        <BreakdownCard
          title="Appointments by staff"
          description="Operational workload count, not a performance ranking."
          rows={data.staff}
          empty="No assigned staff appointment data in this period."
        />
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-labelledby="customer-insights"
      >
        <div className="sm:col-span-2 lg:col-span-4">
          <h2 id="customer-insights" className="text-lg font-semibold">
            Customer context
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregate counts only; no customer contact information is included.
          </p>
        </div>
        <CompactMetric
          icon={Users}
          label="All customers"
          value={data.customers.total}
        />
        <CompactMetric
          icon={Activity}
          label="Active in period"
          value={data.customers.with_appointments}
        />
        <CompactMetric
          icon={Users}
          label="New customers"
          value={data.customers.new_customers}
        />
        <CompactMetric
          icon={RefreshCw}
          label="Returning customers"
          value={data.customers.returning_customers}
        />
        <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2 lg:col-span-4">
          New customers were created during the selected business-local period.
          Returning customers had at least one appointment before the period and
          another appointment within it.
        </p>
      </section>

      {error && (
        <p role="status" className="text-sm text-destructive">
          Refresh failed. The previously loaded analytics remain visible.
        </p>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  help,
}: {
  label: string;
  value: number | string;
  help: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-2 text-3xl font-semibold tabular-nums">{value}</dd>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {help}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusCard({ data }: { data: BusinessAnalytics }) {
  const statuses = [
    ["Pending", data.appointments.pending],
    ["Confirmed", data.appointments.confirmed],
    ["Completed", data.appointments.completed],
    ["Cancelled", data.appointments.cancelled],
    ["No-show", data.appointments.no_show],
  ] as const;
  const summary = getAnalyticsSummary(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status and outcomes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Statuses for scheduled appointments in this period.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {statuses.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b pb-3 last:border-0"
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">Historical outcomes</p>
          <p className="mt-1 text-muted-foreground">
            {data.outcomes.eligible
              ? `${data.outcomes.eligible} ended appointments form the rate denominator.`
              : "No appointments have ended in this period, so rates are not available."}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                Cancellation rate
              </dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatRate(summary.cancellationRate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">No-show rate</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatRate(summary.noShowRate)}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description: string;
  rows: Array<AnalyticsCountGroup & { id: string | null; name: string }>;
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="space-y-4" role="list">
            {rows.map((row) => (
              <div key={row.id ?? "unassigned"} role="listitem">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.total} appointments
                  </span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.total / max) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.completed} completed · {row.cancelled} cancelled
                </p>
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

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-semibold">Unable to load analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No placeholder metrics were substituted for unavailable data.
        </p>
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
function formatRate(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)}%`;
}
function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
