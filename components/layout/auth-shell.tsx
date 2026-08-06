import { Calendar, ShieldCheck, Zap, TrendingUp } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/status';

const TRUST_PRINCIPLES = [
  { icon: ShieldCheck, label: 'Secure authentication' },
  { icon: Zap, label: 'Fast & reliable scheduling' },
  { icon: TrendingUp, label: 'Built for growing businesses' },
];

const PREVIEW_METRICS = [
  { value: '12', label: 'Appointments' },
  { value: '4', label: 'Staff working' },
  { value: '3', label: 'New customers' },
];

const PREVIEW_APPOINTMENTS = [
  {
    time: '09:00',
    initials: 'AS',
    name: 'Anita Sharma',
    service: 'Consultation · 30 min',
    status: { label: 'Confirmed', variant: 'info' as const },
  },
  {
    time: '10:30',
    initials: 'ML',
    name: 'Marcus Lee',
    service: 'Follow-up · 45 min',
    status: { label: 'Confirmed', variant: 'info' as const },
  },
  {
    time: '13:15',
    initials: 'PN',
    name: 'Priya Nair',
    service: 'Full session · 60 min',
    status: { label: 'Pending', variant: 'warning' as const },
  },
];

function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-elevation-4"
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-error/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
        </div>
        <div className="flex-1 rounded-full border border-border bg-background px-3 py-1 text-caption text-muted-foreground">
          calora.app/dashboard
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-small font-medium text-card-foreground">Today</p>
            <p className="text-caption text-muted-foreground">Tuesday, 14 March</p>
          </div>
          <StatusBadge status="on-track" variant="success" label="On track" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {PREVIEW_METRICS.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border bg-muted p-3">
              <p className="text-h4 text-card-foreground">{metric.value}</p>
              <p className="mt-1 text-caption text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {PREVIEW_APPOINTMENTS.map((appointment) => (
            <div
              key={appointment.time}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <span className="w-10 shrink-0 text-caption font-medium text-muted-foreground">
                {appointment.time}
              </span>
              <span className="h-10 w-1 shrink-0 rounded-full bg-primary" />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-caption font-medium text-primary">
                  {appointment.initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium text-card-foreground">
                  {appointment.name}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {appointment.service}
                </span>
              </span>
              <StatusBadge
                status={appointment.status.label}
                variant={appointment.status.variant}
                label={appointment.status.label}
                className="shrink-0 text-caption font-medium"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden flex-col justify-between bg-sidebar p-8 lg:flex lg:w-2/5 xl:p-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-h5 text-sidebar-foreground">Calora</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-h4 text-sidebar-foreground">
              Smart appointment booking for every business.
            </p>
            <p className="text-small text-sidebar-foreground/70">
              Manage appointments, customers, and staff in one place.
            </p>
          </div>

          <DashboardPreview />

          <ul className="space-y-3">
            {TRUST_PRINCIPLES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
                <span className="text-small text-sidebar-foreground/70">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-caption text-sidebar-foreground/70">
          © 2025 Calora. All rights reserved.
        </p>
      </aside>

      <main className="flex w-full items-center justify-center bg-background p-6 lg:w-3/5 lg:p-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
