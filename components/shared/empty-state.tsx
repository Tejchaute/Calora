import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  action,
  className,
}: EmptyStateProps) {
  const primary = primaryAction ?? action;
  const renderAction = (act: EmptyStateAction) => {
    const ActionIcon = act.icon;
    const content = (
      <Button variant={act.variant ?? 'default'} size="sm">
        {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
        {act.label}
      </Button>
    );
    if (act.href) {
      return <Link key={act.label} href={act.href}>{content}</Link>;
    }
    return (
      <Button key={act.label} variant={act.variant ?? 'default'} size="sm" onClick={act.onClick}>
        {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
        {act.label}
      </Button>
    );
  };

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {illustration ?? (Icon && <Icon className="h-12 w-12 text-muted-foreground/50" />)}
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {(primary || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {primary && renderAction(primary)}
          {secondaryAction && renderAction(secondaryAction)}
        </div>
      )}
    </div>
  );
}
