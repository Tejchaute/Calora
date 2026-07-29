import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={STATUS_COLORS[status] ?? 'bg-muted text-foreground'} variant="secondary">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
