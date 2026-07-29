'use client';

import { useState, useId } from 'react';
import { format, parseISO, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPrimitive } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', disabled, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarPrimitive
          mode="single"
          selected={value}
          onSelect={(d) => { onChange?.(d); setOpen(false); }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onFromChange?: (date: Date | undefined) => void;
  onToChange?: (date: Date | undefined) => void;
  className?: string;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, className }: DateRangePickerProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}>
      <DatePicker value={from} onChange={onFromChange} placeholder="Start date" />
      <span className="hidden text-muted-foreground sm:block">to</span>
      <DatePicker value={to} onChange={onToChange} placeholder="End date" />
    </div>
  );
}

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  step?: number;
}

export function TimePicker({ value = '', onChange, disabled, className, step = 30 }: TimePickerProps) {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  const [open, setOpen] = useState(false);
  const display = value ? format(parseISO(`1970-01-01T${value}`), 'h:mm a') : '';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
        >
          <Clock className="mr-2 h-4 w-4" />
          {display || 'Pick a time'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <div className="max-h-60 overflow-y-auto">
          {slots.map((slot) => (
            <button
              key={slot}
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                slot === value && 'bg-primary text-primary-foreground hover:bg-primary'
              )}
              onClick={() => { onChange?.(slot); setOpen(false); }}
            >
              {format(parseISO(`1970-01-01T${slot}`), 'h:mm a')}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps {
  date?: Date;
  time?: string;
  onDateChange?: (date: Date | undefined) => void;
  onTimeChange?: (time: string) => void;
  className?: string;
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange, className }: DateTimePickerProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <DatePicker value={date} onChange={onDateChange} />
      <TimePicker value={time} onChange={onTimeChange} />
    </div>
  );
}

interface TimeRangePickerProps {
  startTime?: string;
  endTime?: string;
  onStartChange?: (time: string) => void;
  onEndChange?: (time: string) => void;
  className?: string;
}

export function TimeRangePicker({ startTime, endTime, onStartChange, onEndChange, className }: TimeRangePickerProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}>
      <TimePicker value={startTime} onChange={onStartChange} />
      <span className="hidden text-muted-foreground sm:block">to</span>
      <TimePicker value={endTime} onChange={onEndChange} />
    </div>
  );
}

export function TimezoneDisplay({ timezone, className }: { timezone?: string; className?: string }) {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short', timeZone: tz }).split(' ').pop();
  return (
    <span className={cn('text-sm text-muted-foreground', className)}>
      {tz} ({offset})
    </span>
  );
}

export function RelativeTime({ date, className }: { date: Date | string; className?: string }) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMins = differenceInMinutes(now, d);
  const diffHours = differenceInHours(now, d);
  const diffDays = differenceInDays(now, d);

  let label: string;
  if (Math.abs(diffMins) < 1) label = 'just now';
  else if (Math.abs(diffMins) < 60) label = `${Math.abs(diffMins)}m ${diffMins > 0 ? 'ago' : 'from now'}`;
  else if (Math.abs(diffHours) < 24) label = `${Math.abs(diffHours)}h ${diffHours > 0 ? 'ago' : 'from now'}`;
  else if (Math.abs(diffDays) < 30) label = `${Math.abs(diffDays)}d ${diffDays > 0 ? 'ago' : 'from now'}`;
  else label = format(d, 'MMM d, yyyy');

  return (
    <time dateTime={d.toISOString()} title={format(d, 'PPpp')} className={cn('text-sm text-muted-foreground', className)}>
      {label}
    </time>
  );
}

export function DurationDisplay({ minutes, className }: { minutes: number; className?: string }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return <span className={cn('text-sm text-muted-foreground', className)}>{label}</span>;
}

interface DurationPickerProps {
  value?: number;
  onChange?: (minutes: number) => void;
  options?: number[];
  className?: string;
}

const DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120];

export function DurationPicker({ value, onChange, options = DEFAULT_DURATIONS, className }: DurationPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const h = Math.floor(opt / 60);
        const m = opt % 60;
        const label = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
        return (
          <button
            key={opt}
            onClick={() => onChange?.(opt)}
            aria-pressed={value === opt}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
