'use client';

import { ReactNode, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarProps, SidebarToggle } from './sidebar';
import { Topbar, TopbarProps } from './topbar';

export interface DashboardShellClientProps {
  sidebar: Omit<SidebarProps, 'mobileOpen' | 'onMobileOpenChange' | 'activePath'>;
  topbar?: Omit<TopbarProps, 'onMobileMenuToggle'>;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardShellClient({
  sidebar,
  topbar,
  children,
  footer,
  className,
  contentClassName,
}: DashboardShellClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const pathname = usePathname();

  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-elevation-2"
      >
        Skip to content
      </a>

      <Sidebar
        {...sidebar}
        activePath={pathname}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div className="flex flex-1 flex-col lg:pl-64">
        <Topbar
          {...topbar}
          onMobileMenuToggle={toggleMobile}
        />

        <main
          id="main-content"
          className={cn('flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8', contentClassName)}
        >
          {children}
          {footer && <footer className="mt-8">{footer}</footer>}
        </main>
      </div>
    </div>
  );
}
