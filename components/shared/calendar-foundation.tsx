'use client';

import { ReactNode, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Calendar,
  AlignJustify,
  LayoutGrid,
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';

export interface CalendarShellProps {
  children: ReactNode;
  toolbar?: ReactNode;
  className?: string;
}

export function CalendarShell({ children, toolbar, className }: CalendarShellProps) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-background', className)}>
      {toolbar && <div className="border-b border-border">{toolbar}</div>}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export interface CalendarToolbarProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  className?: string;
}

export function CalendarToolbar({
  title,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
  className,
}: CalendarToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 p-4', className)}>
      <CalendarNavigation title={title} onPrev={onPrev} onNext={onNext} onToday={onToday} />
      <CalendarViewSwitcher view={view} onViewChange={onViewChange} />
    </div>
  );
}

interface CalendarNavigationProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarNavigation({ title, onPrev, onNext, onToday }: CalendarNavigationProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onPrev} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNext} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
    </div>
  );
}

const VIEW_OPTIONS: { value: CalendarView; label: string; icon: typeof Calendar }[] = [
  { value: 'month', label: 'Month', icon: LayoutGrid },
  { value: 'week', label: 'Week', icon: CalendarDays },
  { value: 'day', label: 'Day', icon: Calendar },
  { value: 'agenda', label: 'Agenda', icon: AlignJustify },
];

interface CalendarViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

export function CalendarViewSwitcher({ view, onViewChange }: CalendarViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-border p-0.5">
      {VIEW_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = view === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onViewChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-background text-foreground shadow-elevation-1' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeekHeaderProps {
  weekDates?: Date[];
  className?: string;
}

export function WeekHeader({ weekDates, className }: WeekHeaderProps) {
  const today = new Date();
  const dates = weekDates ?? Array.from({ length: 7 }, (_, i) => addDays(today, i - today.getDay()));
  return (
    <div className={cn('grid grid-cols-7 border-b border-border', className)}>
      {dates.map((date, i) => {
        const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        return (
          <div key={i} className="flex flex-col items-center py-2 text-sm">
            <span className="text-xs text-muted-foreground">{DAYS_OF_WEEK[date.getDay()]}</span>
            <span
              className={cn(
                'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}
            >
              {format(date, 'd')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface CalendarGridProps {
  children: ReactNode;
  columns?: number;
  className?: string;
}

export function CalendarGrid({ children, columns = 7, className }: CalendarGridProps) {
  return (
    <div
      className={cn('grid flex-1 overflow-auto', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

interface DayColumnProps {
  date: Date;
  children?: ReactNode;
  isToday?: boolean;
  className?: string;
}

export function DayColumn({ date, children, isToday, className }: DayColumnProps) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const dayIsToday = isToday ?? format(date, 'yyyy-MM-dd') === todayStr;
  return (
    <div
      className={cn(
        'relative min-h-[600px] border-r border-border last:border-r-0',
        dayIsToday && 'bg-primary/5',
        className
      )}
    >
      {children}
    </div>
  );
}

interface TimeGridProps {
  startHour?: number;
  endHour?: number;
  children?: ReactNode;
  className?: string;
}

export function TimeGrid({ startHour = 0, endHour = 24, children, className }: TimeGridProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  return (
    <div className={cn('relative flex', className)}>
      <div className="w-16 flex-shrink-0 border-r border-border">
        {hours.map((h) => (
          <div key={h} className="relative h-16 text-right pr-2">
            <span className="absolute -top-2 right-2 text-xs text-muted-foreground">
              {h === 0 ? '' : format(new Date(0, 0, 0, h), 'h a')}
            </span>
          </div>
        ))}
      </div>
      <div className="relative flex-1">
        {hours.map((h) => (
          <div key={h} className="h-16 border-b border-border/50" />
        ))}
        {children}
      </div>
    </div>
  );
}

interface TimeSlotProps {
  hour: number;
  minute?: number;
  duration?: number;
  children?: ReactNode;
  color?: string;
  className?: string;
}

export function TimeSlot({ hour, minute = 0, duration = 60, children, color, className }: TimeSlotProps) {
  const top = ((hour * 60 + minute) / 60) * 64;
  const height = (duration / 60) * 64;
  return (
    <div
      className={cn('absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-xs', className)}
      style={{ top: `${top}px`, height: `${height}px`, backgroundColor: color ?? 'hsl(var(--primary) / 0.15)', borderLeft: `3px solid ${color ?? 'hsl(var(--primary))'}` }}
    >
      {children}
    </div>
  );
}

export function CurrentTimeIndicator({ hour, minute }: { hour?: number; minute?: number }) {
  const now = new Date();
  const h = hour ?? now.getHours();
  const m = minute ?? now.getMinutes();
  const top = ((h * 60 + m) / 60) * 64;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top: `${top}px` }}>
      <div className="flex items-center gap-1">
        <div className="h-2.5 w-2.5 rounded-full bg-error" />
        <div className="h-px flex-1 bg-error" />
      </div>
    </div>
  );
}

interface LegendItem {
  label: string;
  color: string;
}

export function CalendarLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4 px-4 py-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function CalendarEmptyState({ message = 'No events scheduled.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function useCalendarNav(initialView: CalendarView = 'week') {
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());

  const goTo = (direction: 1 | -1) => {
    setCurrentDate((d) => {
      if (view === 'day') return direction === 1 ? addDays(d, 1) : subDays(d, 1);
      if (view === 'week') return direction === 1 ? addWeeks(d, 1) : subWeeks(d, 1);
      return direction === 1 ? addMonths(d, 1) : subMonths(d, 1);
    });
  };

  return {
    view,
    setView,
    currentDate,
    setCurrentDate,
    goNext: () => goTo(1),
    goPrev: () => goTo(-1),
    goToday: () => setCurrentDate(new Date()),
  };
}
