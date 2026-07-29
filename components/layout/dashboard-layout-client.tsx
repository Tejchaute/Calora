'use client';

import { Calendar } from 'lucide-react';
import { DashboardShellClient } from '@/components/layout/dashboard-shell-client';
import { NAV_ITEMS } from '@/config/navigation';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Calendar className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-semibold text-sidebar-foreground">Calora</span>
    </div>
  );

  return (
    <DashboardShellClient sidebar={{ navItems: [...NAV_ITEMS], logo }}>
      {children}
    </DashboardShellClient>
  );
}
