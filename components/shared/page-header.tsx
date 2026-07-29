import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PageHeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) =>
            action.href ? (
              <Link key={action.label} href={action.href}>
                <Button variant={action.variant ?? 'default'}>
                  {action.icon}
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button
                key={action.label}
                variant={action.variant ?? 'default'}
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
