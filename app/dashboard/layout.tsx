'use client';

import { Calendar } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { NAV_ITEMS } from '@/config/navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Calendar className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-semibold text-sidebar-foreground">Calora</span>
    </div>
  );

  return (
    <DashboardShell sidebar={{ navItems: [...NAV_ITEMS], logo }}>{children}</DashboardShell>
  );
}
