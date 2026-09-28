'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { BusinessAnalytics } from '../types/analytics.types';

const chartConfig = {
  total: { label: 'Appointments', color: 'hsl(var(--primary))' },
  completed: { label: 'Completed', color: 'hsl(var(--success))' },
  cancelled: { label: 'Cancelled', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig;

export function AnalyticsTrendChart({ data }: { data: BusinessAnalytics }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Appointments over time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily scheduled, completed, and cancelled counts.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-72 w-full aspect-auto"
          role="img"
          aria-label={`Daily appointment counts from ${data.range.start_date} to ${data.range.end_date}`}
        >
          <BarChart
            data={data.trend}
            accessibilityLayer
            margin={{ left: -20, right: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickFormatter={shortDate}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cancelled" fill="var(--color-cancelled)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            View daily data table
          </summary>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background">
                <tr><th className="p-2">Date</th><th className="p-2">Scheduled</th><th className="p-2">Completed</th><th className="p-2">Cancelled</th></tr>
              </thead>
              <tbody>
                {data.trend.map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="p-2">{formatDateOnly(row.date)}</td>
                    <td className="p-2 tabular-nums">{row.total}</td>
                    <td className="p-2 tabular-nums">{row.completed}</td>
                    <td className="p-2 tabular-nums">{row.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
