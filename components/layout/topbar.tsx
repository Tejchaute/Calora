'use client';

import { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export interface TopbarProps {
  logo?: ReactNode;
  title?: string;
  breadcrumbs?: ReactNode;
  search?: ReactNode;
  notifications?: ReactNode;
  status?: ReactNode;
  userMenu?: ReactNode;
  showThemeToggle?: boolean;
  onMobileMenuToggle?: () => void;
  className?: string;
}

export function Topbar({
  logo,
  title,
  breadcrumbs,
  search,
  notifications,
  status,
  userMenu,
  showThemeToggle = true,
  onMobileMenuToggle,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8',
        className
      )}
    >
      {onMobileMenuToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          aria-label="Open navigation"
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {logo && <div className="flex items-center gap-2 lg:hidden">{logo}</div>}

      {title && (
        <h1 className="hidden text-lg font-semibold text-foreground lg:block">{title}</h1>
      )}

      {breadcrumbs && <div className="hidden lg:block">{breadcrumbs}</div>}

      <div className="flex-1">{search}</div>

      <div className="flex items-center gap-2">
        {status}
        {showThemeToggle && <ThemeToggle />}
        {notifications}
        {userMenu}
      </div>
    </header>
  );
}
