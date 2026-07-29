'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkline } from './chart-foundation';

interface TimelineItem {
  title: string;
  description?: string;
  timestamp?: string;
  icon?: ReactNode;
  color?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('relative space-y-6', className)}>
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2"
              style={{ borderColor: item.color ?? 'hsl(var(--border))' }}
            >
              {item.icon}
            </div>
            {i < items.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
            {item.timestamp && <p className="mt-1 text-xs text-muted-foreground">{item.timestamp}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface ActivityFeedItem {
  id: string;
  user?: string;
  action: string;
  timestamp: string;
  avatar?: ReactNode;
}

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  className?: string;
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          {item.avatar ?? <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted" />}
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {item.user && <span className="font-medium">{item.user} </span>}
              {item.action}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MetricItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  sparklineData?: number[];
}

interface MetricGridProps {
  metrics: MetricItem[];
  columns?: number;
  className?: string;
}

export function MetricGrid({ metrics, columns = 4, className }: MetricGridProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {metrics.map((metric, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            {metric.icon && <div className="mb-2">{metric.icon}</div>}
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{metric.label}</p>
            {metric.trend !== undefined && <TrendIndicator value={metric.trend} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface StatisticsPanelProps {
  title?: string;
  stats: { label: string; value: string | number }[];
  className?: string;
}

export function StatisticsPanel({ title, stats, className }: StatisticsPanelProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        {title && <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>}
        <dl className="grid grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <div key={i}>
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function SummaryCard({ title, value, description, icon, className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function TrendIndicator({ value, className }: { value: number; className?: string }) {
  if (value === 0) {
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-xs text-muted-foreground', className)}>
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  const color = value > 0 ? 'text-success' : 'text-error';
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', color, className)}>
      <Icon className="h-3 w-3" /> {Math.abs(value)}%
    </span>
  );
}

export function ComparisonBadge({
  current,
  previous,
  className,
}: {
  current: number;
  previous: number;
  className?: string;
}) {
  const diff = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  return <TrendIndicator value={Math.round(diff)} className={className} />;
}

export { Sparkline };
