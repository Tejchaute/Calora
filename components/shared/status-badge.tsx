import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label?: string;
  className?: string;
}

const variantStyles: Record<string, string> = {
  success: 'bg-success/15 text-success border-transparent',
  warning: 'bg-warning/15 text-warning border-transparent',
  error: 'bg-error/15 text-error border-transparent',
  info: 'bg-info/15 text-info border-transparent',
  neutral: 'bg-muted text-foreground border-transparent',
};

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'error',
};

const statusLabelMap: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status, variant, label, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? statusVariantMap[status] ?? 'neutral';
  return (
    <Badge
      variant="secondary"
      className={cn(variantStyles[resolvedVariant], className)}
    >
      {label ?? statusLabelMap[status] ?? status}
    </Badge>
  );
}
