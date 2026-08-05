import { Calendar, ShieldCheck, Zap, TrendingUp } from 'lucide-react';

const TRUST_PRINCIPLES = [
  { icon: ShieldCheck, label: 'Secure authentication' },
  { icon: Zap, label: 'Fast & reliable scheduling' },
  { icon: TrendingUp, label: 'Built for growing businesses' },
];

const PREVIEW_APPOINTMENTS = [
  { time: '09:00', name: 'Anita Sharma', service: 'Consultation' },
  { time: '10:30', name: 'Marcus Lee', service: 'Follow-up' },
  { time: '13:15', name: 'Priya Nair', service: 'Full session' },
];

function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-border bg-card shadow-elevation-3"
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-small font-medium text-card-foreground">Today</p>
          <p className="text-caption text-muted-foreground">Tuesday, 14 March</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted p-3">
            <p className="text-h5 text-card-foreground">12</p>
            <p className="text-caption text-muted-foreground">Appointments</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-h5 text-card-foreground">4</p>
            <p className="text-caption text-muted-foreground">Staff working</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-h5 text-card-foreground">3</p>
            <p className="text-caption text-muted-foreground">New customers</p>
          </div>
        </div>

        <div className="space-y-2">
          {PREVIEW_APPOINTMENTS.map((appointment) => (
            <div
              key={appointment.time}
              className="flex items-center gap-3 rounded-md border border-border p-3"
            >
              <span className="text-caption font-medium text-muted-foreground">
                {appointment.time}
              </span>
              <span className="h-8 w-1 rounded-full bg-primary" />
              <span className="flex-1">
                <span className="block text-small font-medium text-card-foreground">
                  {appointment.name}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {appointment.service}
                </span>
              </span>
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

        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-h3 text-sidebar-foreground">
              Smart appointment booking for every business.
            </p>
            <p className="text-body text-sidebar-foreground/70">
              Manage appointments, customers, and staff in one place.
            </p>
          </div>

          <DashboardPreview />

          <ul className="space-y-2">
            {TRUST_PRINCIPLES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
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
