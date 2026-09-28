'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  Link2,
  UserRound,
} from 'lucide-react';

const workspaceLinks = [
  {
    href: '/dashboard/booking-page',
    title: 'Booking configuration',
    description: 'Open your public booking link and customer-facing page tools.',
    icon: Link2,
  },
  {
    href: '/dashboard/working-hours',
    title: 'Working hours',
    description: 'Manage the persisted schedule, breaks, and holidays used for availability.',
    icon: Clock3,
  },
  {
    href: '/dashboard/staff',
    title: 'Staff schedules & time off',
    description: 'Review staff assignments, schedule context, and approved time off.',
    icon: CalendarClock,
  },
  {
    href: '/dashboard/profile',
    title: 'Your account',
    description: 'Manage your personal profile, password, appearance, and session.',
    icon: UserRound,
  },
] as const;

export function SettingsWorkspaceLinks() {
  return (
    <section aria-labelledby="workspace-navigation-heading">
      <div className="mb-4">
        <h2
          id="workspace-navigation-heading"
          className="text-lg font-semibold text-foreground"
        >
          Workspace configuration
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Continue to the existing workspace that owns each operational setting.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {workspaceLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-28 items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 font-medium text-foreground">
                  {item.title}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
