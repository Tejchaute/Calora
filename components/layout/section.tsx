import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Section({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>{children}</section>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col justify-between gap-4 sm:flex-row sm:items-center', className)}>
      <div>
        <h2 className="text-h3">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
