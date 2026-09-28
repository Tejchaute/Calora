import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function getDateInTimeZone(
  timeZone: string,
  date = new Date()
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getTimeInTimeZone(
  timeZone: string,
  date = new Date()
): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.hour}:${values.minute}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatTime(time: string): string {
  if (!time.includes(':')) return time;

  const [hours, minutes] = time.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)}, ${formatTime(time)}`;
}

export function getInitials(name: string): string {
  if (!name?.trim()) return '?';

  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

export function generateTimeSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
  breakStart?: string | null,
  breakEnd?: string | null
): string[] {
  const slots: string[] = [];

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  let current = openH * 60 + openM;
  let end = closeH * 60 + closeM;

  // Overnight business support
  // Example: 22:00 → 02:00
  if (end <= current) {
    end += 24 * 60;
  }

  let breakStartMinutes: number | null = null;
  let breakEndMinutes: number | null = null;

  if (breakStart && breakEnd) {
    const [bsH, bsM] = breakStart.split(':').map(Number);
    const [beH, beM] = breakEnd.split(':').map(Number);

    breakStartMinutes = bsH * 60 + bsM;
    breakEndMinutes = beH * 60 + beM;

    // Overnight break support
    if (breakEndMinutes <= breakStartMinutes) {
      breakEndMinutes += 24 * 60;
    }

    // If business itself is overnight and break occurs after midnight
    if (breakStartMinutes < openH * 60 + openM && end > 24 * 60) {
      breakStartMinutes += 24 * 60;
      breakEndMinutes += 24 * 60;
    }
  }

  while (current + durationMinutes <= end) {
    const normalizedMinutes = current % (24 * 60);

    const h = Math.floor(normalizedMinutes / 60);
    const m = normalizedMinutes % 60;

    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let inBreak = false;

    if (
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      current < breakEndMinutes &&
      current + durationMinutes > breakStartMinutes
    ) {
      inBreak = true;
    }

    if (!inBreak) {
      slots.push(timeStr);
    }

    current += durationMinutes;
  }

  return slots;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const newH = Math.floor(normalized / 60);
  const newM = normalized % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  confirmed: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-error/15 text-error',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
