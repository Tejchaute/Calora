'use client';

import { ReactNode } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="hsl(var(--primary))"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold text-foreground">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

interface OverlayProps {
  visible: boolean;
  children?: ReactNode;
  className?: string;
}

export function LoadingOverlay({ visible, children, className }: OverlayProps) {
  if (!visible) return null;
  return (
    <div className={cn('absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm', className)}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {children && <p className="text-sm text-muted-foreground">{children}</p>}
      </div>
    </div>
  );
}

export function SuccessOverlay({ visible, message, className }: OverlayProps & { message?: string }) {
  if (!visible) return null;
  return (
    <div className={cn('absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        {message && <p className="text-sm font-medium text-foreground">{message}</p>}
      </div>
    </div>
  );
}

export function ErrorOverlay({ visible, message, className }: OverlayProps & { message?: string }) {
  if (!visible) return null;
  return (
    <div className={cn('absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/15">
          <XCircle className="h-8 w-8 text-error" />
        </div>
        {message && <p className="text-sm font-medium text-foreground">{message}</p>}
      </div>
    </div>
  );
}

export function ProcessingOverlay({ visible, message, className, progress }: OverlayProps & { message?: string; progress?: number }) {
  if (!visible) return null;
  return (
    <div className={cn('absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm', className)}>
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <Clock className="h-8 w-8 animate-pulse text-primary" />
        {message && <p className="text-sm font-medium text-foreground">{message}</p>}
        {progress !== undefined && (
          <div className="w-full space-y-1">
            <Progress value={progress} />
            <p className="text-right text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyDashboardPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <LayoutDashboard className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">Nothing here yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Your dashboard will populate once you start adding data.</p>
    </div>
  );
}
