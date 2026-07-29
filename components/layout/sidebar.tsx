'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ComponentType, ReactNode, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  children?: NavItem[];
}

export interface SidebarProps {
  navItems: NavItem[];
  logo?: ReactNode;
  footer?: ReactNode;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNavItemClick?: () => void;
  activePath?: string;
}

export function Sidebar({
  navItems,
  logo,
  footer,
  mobileOpen,
  onMobileOpenChange,
  onNavItemClick,
  activePath,
}: SidebarProps) {
  const closeMobile = useCallback(() => onMobileOpenChange(false), [onMobileOpenChange]);

  const isActive = (href: string) => {
    if (!activePath) return false;
    if (href === '/dashboard') return activePath === href;
    return activePath.startsWith(href);
  };

  const renderNavItem = (item: NavItem, isNested = false) => {
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={() => {
            onNavItemClick?.();
            closeMobile();
          }}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
            isNested && 'ml-6 pl-3',
            active
              ? 'bg-primary text-primary-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'
          )}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && <span className="ml-auto">{item.badge}</span>}
        </Link>
        {item.children && item.children.length > 0 && (
          <ul className="mt-1 space-y-1">{item.children.map((child) => renderNavItem(child, true))}</ul>
        )}
      </li>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-foreground/10 px-6">
          {logo ?? <span className="text-lg font-semibold text-sidebar-foreground">Calora</span>}
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground lg:hidden"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Main navigation">
          <ul className="space-y-1">{navItems.map((item) => renderNavItem(item))}</ul>
        </nav>

        {footer && <div className="border-t border-sidebar-foreground/10 p-3">{footer}</div>}
      </aside>
    </>
  );
}

export function SidebarToggle({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label="Open navigation"
      className={cn('text-foreground', className)}
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
