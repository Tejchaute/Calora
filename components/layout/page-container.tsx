import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl', className)}>{children}</div>
  );
}

export function PageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>{children}</div>
  );
}

export function PageActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  );
}
