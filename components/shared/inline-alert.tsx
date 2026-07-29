import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const inlineAlertVariants = cva(
  'flex items-start gap-3 rounded-lg border p-4 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        success: 'bg-success/10 text-foreground border-success/20',
        warning: 'bg-warning/10 text-foreground border-warning/20',
        error: 'bg-error/10 text-foreground border-error/20',
        info: 'bg-info/10 text-foreground border-info/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

const iconMap: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const iconColorMap: Record<string, string> = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
};

interface InlineAlertProps extends VariantProps<typeof inlineAlertVariants> {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function InlineAlert({ variant = 'default', title, children, className }: InlineAlertProps) {
  const Icon = variant ? iconMap[variant] : null;
  const iconColor = variant ? iconColorMap[variant] : iconColorMap.default;

  return (
    <div className={cn(inlineAlertVariants({ variant }), className)} role="alert">
      {Icon && <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)} />}
      <div className="flex-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <div className={cn(title && 'mt-1', 'text-muted-foreground')}>{children}</div>
      </div>
    </div>
  );
}
