'use client';

import { ReactNode, useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SEMANTIC_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface BaseChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  config?: ChartConfig;
}

export function LineChart({ data, xKey, yKey, color = SEMANTIC_COLORS[0], height = 250, config }: BaseChartProps) {
  const chartConfig = config ?? { [yKey]: { label: yKey, color } };
  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <RechartsLineChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
      </RechartsLineChart>
    </ChartContainer>
  );
}

export function BarChart({ data, xKey, yKey, color = SEMANTIC_COLORS[0], height = 250, config }: BaseChartProps) {
  const chartConfig = config ?? { [yKey]: { label: yKey, color } };
  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <RechartsBarChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={yKey} fill={color} radius={4} />
      </RechartsBarChart>
    </ChartContainer>
  );
}

export function AreaChart({ data, xKey, yKey, color = SEMANTIC_COLORS[0], height = 250, config }: BaseChartProps) {
  const chartConfig = config ?? { [yKey]: { label: yKey, color } };
  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <RechartsAreaChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#gradient-${yKey})`} />
      </RechartsAreaChart>
    </ChartContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  config?: ChartConfig;
  colors?: string[];
}

export function PieChart({ data, height = 250, config, colors = SEMANTIC_COLORS }: PieChartProps) {
  const chartConfig = config ?? Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: colors[i % colors.length] }])
  );
  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <RechartsPieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={0} outerRadius={80}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </RechartsPieChart>
    </ChartContainer>
  );
}

export function DonutChart({ data, height = 250, config, colors = SEMANTIC_COLORS }: PieChartProps) {
  const chartConfig = config ?? Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: colors[i % colors.length] }])
  );
  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <RechartsPieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </RechartsPieChart>
    </ChartContainer>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color = SEMANTIC_COLORS[0], width = 100, height = 30 }: SparklineProps) {
  const chartData = data.map((v, i) => ({ idx: i, value: v }));
  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsLineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Line dataKey="value" stroke={color} strokeWidth={1.5} dot={false} type="monotone" />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface MetricTrendProps {
  data: number[];
  label?: string;
  value?: string | number;
  color?: string;
}

export function MetricTrend({ data, label, value, color = SEMANTIC_COLORS[0] }: MetricTrendProps) {
  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    return data[data.length - 1] - data[0];
  }, [data]);

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
        {value !== undefined && <p className="text-2xl font-bold text-foreground">{value}</p>}
        <div className={cn('mt-1 flex items-center gap-1 text-sm', trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{Math.abs(trend)}</span>
        </div>
      </div>
      <Sparkline data={data} color={color} width={120} height={40} />
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, actions, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
export type { ChartConfig };
