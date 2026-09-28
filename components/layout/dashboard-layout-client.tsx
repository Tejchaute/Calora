'use client';

import { Calendar } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { DashboardShellClient } from '@/components/layout/dashboard-shell-client';
import { NAV_ITEMS } from '@/config/navigation';
import { SubscriptionIndicator } from '@/features/subscriptions/components/subscription-indicator';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Calendar className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-semibold text-sidebar-foreground">Calora</span>
    </div>
  );

  if (pathname === '/dashboard/setup') {
    return (
      <div className="min-h-screen bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow-elevation-2"
        >
          Skip to setup
        </a>
        <header className="border-b border-border/80 bg-background/95">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Calendar className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-lg font-semibold text-foreground">Calora</span>
            </div>
          </div>
        </header>
        <main id="main-content">{children}</main>
      </div>
    );
  }

  return (
    <DashboardShellClient sidebar={{ navItems: [...NAV_ITEMS], logo }} topbar={{ status: <SubscriptionIndicator /> }}>
      {children}
    </DashboardShellClient>
  );
}
