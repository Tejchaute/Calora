import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-success/15 text-success border-transparent',
  warning: 'bg-warning/15 text-warning border-transparent',
  error: 'bg-error/15 text-error border-transparent',
  info: 'bg-info/15 text-info border-transparent',
  neutral: 'bg-muted text-foreground border-transparent',
};

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, variant, label, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? 'neutral';
  return (
    <Badge
      variant="secondary"
      className={cn(variantStyles[resolvedVariant], className)}
    >
      {label ?? status}
    </Badge>
  );
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';

const priorityConfig: Record<Priority, { variant: StatusVariant; label: string }> = {
  low: { variant: 'neutral', label: 'Low' },
  medium: { variant: 'info', label: 'Medium' },
  high: { variant: 'warning', label: 'High' },
  urgent: { variant: 'error', label: 'Urgent' },
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const config = priorityConfig[priority] ?? priorityConfig.medium;
  return <StatusBadge status={priority} variant={config.variant} label={config.label} className={className} />;
}

type Availability = 'available' | 'busy' | 'offline';

const availabilityConfig: Record<Availability, { variant: StatusVariant; label: string }> = {
  available: { variant: 'success', label: 'Available' },
  busy: { variant: 'warning', label: 'Busy' },
  offline: { variant: 'neutral', label: 'Offline' },
};

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  const config = availabilityConfig[availability] ?? availabilityConfig.offline;
  return (
    <StatusBadge status={availability} variant={config.variant} label={config.label} className={className} />
  );
}

export function ConnectionStatus({
  connected,
  className,
}: {
  connected: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          connected ? 'bg-success' : 'bg-error'
        )}
        aria-hidden="true"
      />
      <span className="text-muted-foreground">{connected ? 'Connected' : 'Disconnected'}</span>
    </span>
  );
}
