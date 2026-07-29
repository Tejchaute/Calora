'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppointmentFormDialog } from '@/features/appointments/components/appointment-form-dialog';
import { getCalendarAppointments } from '../services/calendar.service';
import { formatTime, formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import type { AppointmentWithRelations, Appointment } from '@/types/database';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';
import { toast } from 'sonner';

type ViewMode = 'day' | 'week' | 'month';

export function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    let start: Date;
    let end: Date;

    if (view === 'month') {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    } else if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = currentDate;
      end = currentDate;
    }

    const { data, error } = await getCalendarAppointments(start, end);

    if (error) {
      toast.error('Failed to load calendar');
    } else {
      setAppointments((data as unknown as AppointmentWithRelations[]) || []);
    }
    setLoading(false);
  }, [view, currentDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const getAppointmentsForDate = (date: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.appointment_date), date));

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    if (view === 'month') {
      setCurrentDate((d) => addMonths(d, direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      setCurrentDate((d) => addWeeks(d, direction === 'next' ? 1 : -1));
    } else {
      setCurrentDate((d) => addDays(d, direction === 'next' ? 1 : -1));
    }
  };

  const handleSlotClick = (date: Date) => {
    setEditAppt(null);
    setDefaultDate(format(date, 'yyyy-MM-dd'));
    setFormOpen(true);
  };

  const handleEditAppt = (appt: AppointmentWithRelations) => {
    setEditAppt(appt);
    setFormOpen(true);
  };

  const headerLabel = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage your schedule.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <SelectTrigger className="w-32">
              <CalendarDays className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => navigate('today')}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditAppt(null);
              setDefaultDate(format(currentDate, 'yyyy-MM-dd'));
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <div className="mb-4 text-center text-lg font-semibold text-foreground">
        {headerLabel()}
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : view === 'month' ? (
        <MonthView
          currentDate={currentDate}
          appointments={appointments}
          onSlotClick={handleSlotClick}
          onEditAppt={handleEditAppt}
        />
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate}
          appointments={appointments}
          onSlotClick={handleSlotClick}
          onEditAppt={handleEditAppt}
        />
      ) : (
        <DayView
          currentDate={currentDate}
          appointments={getAppointmentsForDate(currentDate)}
          onSlotClick={handleSlotClick}
          onEditAppt={handleEditAppt}
        />
      )}

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editAppt}
        defaultDate={defaultDate}
        onSaved={fetchAppointments}
      />
    </div>
  );
}

// ============================================================
// Month View
// ============================================================
function MonthView({
  currentDate,
  appointments,
  onSlotClick,
  onEditAppt,
}: {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  onSlotClick: (date: Date) => void;
  onEditAppt: (appt: AppointmentWithRelations) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const dayAppts = appointments.filter((a) =>
              isSameDay(parseISO(a.appointment_date), date)
            );
            const inMonth = isSameMonth(date, currentDate);
            return (
              <div
                key={date.toISOString()}
                className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                  inMonth ? 'bg-background' : 'bg-muted/50'
                }`}
              >
                <button
                  onClick={() => onSlotClick(date)}
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday(date)
                      ? 'bg-primary text-white'
                      : inMonth
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground'
                  }`}
                >
                  {format(date, 'd')}
                </button>
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map((appt) => (
                    <button
                      key={appt.id}
                      onClick={() => onEditAppt(appt)}
                      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
                    >
                      <div
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: appt.services.color }}
                      />
                      <span className="truncate text-foreground">
                        {formatTime(appt.start_time)} {appt.customers.full_name}
                      </span>
                    </button>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="px-1 text-xs text-muted-foreground">
                      +{dayAppts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Week View
// ============================================================
function WeekView({
  currentDate,
  appointments,
  onSlotClick,
  onEditAppt,
}: {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  onSlotClick: (date: Date) => void;
  onEditAppt: (appt: AppointmentWithRelations) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM – 6 PM

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-8 border-b border-border">
          <div className="border-r border-border p-3 text-xs font-semibold text-muted-foreground">
            Time
          </div>
          {days.map((date) => (
            <div
              key={date.toISOString()}
              className="border-r border-border p-3 text-center last:border-r-0"
            >
              <div className="text-xs font-medium text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <div
                className={`mt-1 text-lg font-bold ${
                  isToday(date) ? 'text-primary' : 'text-foreground'
                }`}
              >
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-border">
              <div className="border-r border-border p-2 text-xs text-muted-foreground">
                {formatTime(`${String(hour).padStart(2, '0')}:00`)}
              </div>
              {days.map((date) => {
                const hourAppts = appointments.filter((a) => {
                  if (!isSameDay(parseISO(a.appointment_date), date)) return false;
                  const apptHour = parseInt(a.start_time.split(':')[0]);
                  return apptHour === hour;
                });
                return (
                  <div
                    key={date.toISOString()}
                    className="min-h-[60px] border-r border-border p-1 last:border-r-0 hover:bg-muted/50"
                    onClick={() => onSlotClick(date)}
                  >
                    {hourAppts.map((appt) => (
                      <button
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppt(appt);
                        }}
                        className="mb-1 block w-full rounded-md border-l-2 bg-background p-1.5 text-left text-xs shadow-sm hover:shadow-md"
                        style={{ borderColor: appt.services.color }}
                      >
                        <div className="font-semibold text-foreground">
                          {formatTime(appt.start_time)}
                        </div>
                        <div className="truncate text-muted-foreground">{appt.customers.full_name}</div>
                        <div className="truncate text-muted-foreground">{appt.services.name}</div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Day View
// ============================================================
function DayView({
  currentDate,
  appointments,
  onSlotClick,
  onEditAppt,
}: {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  onSlotClick: (date: Date) => void;
  onEditAppt: (appt: AppointmentWithRelations) => void;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border p-4">
          <div className="text-sm font-semibold text-foreground">
            {format(currentDate, 'EEEE, MMMM d')}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex border-b border-border hover:bg-muted/50"
              onClick={() => onSlotClick(currentDate)}
            >
              <div className="w-20 flex-shrink-0 border-r border-border p-3 text-xs font-medium text-muted-foreground">
                {formatTime(`${String(hour).padStart(2, '0')}:00`)}
              </div>
              <div className="flex-1 p-2">
                {appointments
                  .filter((a) => parseInt(a.start_time.split(':')[0]) === hour)
                  .map((appt) => (
                    <button
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAppt(appt);
                      }}
                      className="mb-2 block w-full rounded-lg border-l-4 bg-background p-3 text-left shadow-sm hover:shadow-md"
                      style={{ borderColor: appt.services.color }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">
                            {formatTime(appt.start_time)} – {appt.customers.full_name}
                          </div>
                          <div className="mt-0.5 text-sm text-muted-foreground">
                            {appt.services.name} • {appt.staff?.full_name || 'Any staff'}
                          </div>
                        </div>
                        <Badge className={STATUS_COLORS[appt.status]} variant="secondary">
                          {STATUS_LABELS[appt.status]}
                        </Badge>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No appointments for this day.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
