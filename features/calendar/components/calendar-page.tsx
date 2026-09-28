'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
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
import {
  getCalendarAppointments,
  getCalendarBusinessClock,
} from '../services/calendar.service';
import { getWorkingHoursData } from '@/features/staff/services/working-hours.service';
import { formatTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import type {
  AppointmentWithRelations,
  Appointment,
  WorkingHours,
  Holiday,
} from '@/types/database';

const AppointmentFormDialog = dynamic(
  () =>
    import('@/features/appointments/components/appointment-form-dialog').then(
      (module) => module.AppointmentFormDialog,
    ),
  { ssr: false },
);
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
} from 'date-fns';
import { handleError } from '@/lib/errors/error-handler';
import { useBusiness } from '@/features/business/hooks/use-business';

type ViewMode = 'day' | 'week' | 'month';

type SlotClickHandler = (date: Date, hour?: number, minute?: number) => void;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isHourWithinWorkingHours(
  date: Date,
  hour: number,
  minute: number,
  workingHours: WorkingHours[],
  holidays: Holiday[],
) {
  const dateString = format(date, 'yyyy-MM-dd');

  const holiday = holidays.some((holiday) => holiday.date === dateString);

  if (holiday) {
    return false;
  }

  const schedule = workingHours.find(
    (hours) => hours.day_of_week === date.getDay(),
  );

  if (!schedule || !schedule.is_open) {
    return false;
  }

  if (!schedule.open_time || !schedule.close_time) {
    return false;
  }

  const slotStart = hour * 60 + minute;
  const slotEnd = slotStart + 30;

  const openTime = timeToMinutes(schedule.open_time);
  const closeTime = timeToMinutes(schedule.close_time);

  // The hourly slot must overlap the business opening interval.
  if (slotStart < openTime || slotEnd > closeTime) {
    return false;
  }

  if (schedule.break_start && schedule.break_end) {
    const breakStart = timeToMinutes(schedule.break_start);
    const breakEnd = timeToMinutes(schedule.break_end);

    // Any overlap with the break makes the hour unavailable.
    if (slotStart < breakEnd && slotEnd > breakStart) {
      return false;
    }
  }

  return true;
}

function getDefaultWorkingHours(dayOfWeek: number) {
  const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;

  return {
    is_open: isWeekday,
    open_time: '09:00',
    close_time: '17:00',
    break_start: null,
    break_end: null,
  };
}

export function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [businessToday, setBusinessToday] = useState('');
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');
  const [defaultTime, setDefaultTime] = useState<string>('09:00');
  const { business, loading: businessLoading } = useBusiness();
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!business?.id) return;
    let active = true;
    void getCalendarBusinessClock(business.id).then(({ data, error }) => {
      if (!active || error) return;
      const clock = Array.isArray(data) ? data[0] : data;
      if (clock?.business_date) {
        setBusinessToday(clock.business_date);
        setCurrentDate(parseISO(clock.business_date));
      }
    });
    return () => {
      active = false;
    };
  }, [business?.id]);

  const fetchAppointments = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    if (!hasLoadedRef.current) setLoading(true);

    try {
      let start: Date;
      let end: Date;

      if (view === 'month') {
        start = startOfWeek(startOfMonth(currentDate), {
          weekStartsOn: 0,
        });
        end = endOfWeek(endOfMonth(currentDate), {
          weekStartsOn: 0,
        });
      } else if (view === 'week') {
        start = startOfWeek(currentDate, {
          weekStartsOn: 0,
        });
        end = endOfWeek(currentDate, {
          weekStartsOn: 0,
        });
      } else {
        start = currentDate;
        end = currentDate;
      }

      const [appointmentsResult, [workingHoursResult, holidaysResult]] =
        await Promise.all([
          getCalendarAppointments(business.id, start, end),
          getWorkingHoursData(business.id),
        ]);

      if (requestId !== requestIdRef.current) return;

      if (appointmentsResult.error) {
        handleError(appointmentsResult.error, {
          fallbackMessage: 'Failed to load calendar',
        });

        setAppointments([]);
      } else {
        setAppointments(
          (appointmentsResult.data as AppointmentWithRelations[]) ?? [],
        );
      }

      if (workingHoursResult.error) {
        handleError(workingHoursResult.error, {
          fallbackMessage: 'Failed to load working hours',
        });

        setWorkingHours([]);
      } else {
        setWorkingHours((workingHoursResult.data as WorkingHours[]) ?? []);
      }

      if (holidaysResult.error) {
        handleError(holidaysResult.error, {
          fallbackMessage: 'Failed to load holidays',
        });

        setHolidays([]);
      } else {
        setHolidays((holidaysResult.data as Holiday[]) ?? []);
      }
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Unexpected error while loading calendar data.',
      });

      setAppointments([]);
      setWorkingHours([]);
      setHolidays([]);
    } finally {
      if (requestId === requestIdRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }
  }, [view, currentDate, business?.id]);

  useEffect(() => {
    if (!businessLoading && business?.id) {
      void fetchAppointments();
    }
    return () => {
      requestIdRef.current += 1;
    };
  }, [businessLoading, business?.id, fetchAppointments]);

  const getAppointmentsForDate = (date: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.appointment_date), date));

  const getWorkingHoursForDate = (date: Date) => {
    const dayOfWeek = date.getDay();

    return (
      workingHours.find((hours) => hours.day_of_week === dayOfWeek) ?? {
        day_of_week: dayOfWeek,
        is_open: dayOfWeek !== 0 && dayOfWeek !== 6,
        open_time: '09:00',
        close_time: '17:00',
        break_start: null,
        break_end: null,
      }
    );
  };

  const isHoliday = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');

    return holidays.some((holiday) => holiday.date === dateString);
  };

  const isBusinessOpen = (date: Date) => {
    if (isHoliday(date)) {
      return false;
    }

    const schedule = getWorkingHoursForDate(date);

    return schedule?.is_open === true;
  };

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(businessToday ? parseISO(businessToday) : currentDate);
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

  const handleSlotClick = (date: Date, hour?: number, minute = 0) => {
    if (isHoliday(date)) {
      return;
    }

    const schedule = getWorkingHoursForDate(date);

    if (!schedule?.is_open) {
      return;
    }

    setEditAppt(null);
    setDefaultDate(format(date, 'yyyy-MM-dd'));
    setDefaultTime(
      typeof hour === 'number'
        ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        : '09:00',
    );
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

  const handleNewAppointment = () => {
    if (isHoliday(currentDate)) {
      handleError(new Error('Cannot create an appointment on a holiday.'), {
        fallbackMessage: 'This date is a holiday.',
      });
      return;
    }

    const schedule = getWorkingHoursForDate(currentDate);

    if (!schedule?.is_open) {
      handleError(new Error('Cannot create an appointment on a closed day.'), {
        fallbackMessage: 'The business is closed on this day.',
      });
      return;
    }

    setEditAppt(null);
    setDefaultDate(format(currentDate, 'yyyy-MM-dd'));
    setDefaultTime('09:00');
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your schedule.
          </p>
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleNewAppointment}>
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
          workingHours={workingHours}
          holidays={holidays}
          businessToday={businessToday}
          onSlotClick={handleSlotClick}
          onEditAppt={handleEditAppt}
        />
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate}
          appointments={appointments}
          workingHours={workingHours}
          holidays={holidays}
          businessToday={businessToday}
          onSlotClick={handleSlotClick}
          onEditAppt={handleEditAppt}
        />
      ) : (
        <DayView
          currentDate={currentDate}
          appointments={getAppointmentsForDate(currentDate)}
          workingHours={workingHours}
          holidays={holidays}
          onSlotClick={handleSlotClick}
          onEditAppt={handleEditAppt}
        />
      )}

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editAppt}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        onSaved={async () => {
          await fetchAppointments();
        }}
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
  workingHours,
  holidays,
  businessToday,
  onSlotClick,
  onEditAppt,
}: {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  workingHours: WorkingHours[];
  holidays: Holiday[];
  businessToday: string;
  onSlotClick: SlotClickHandler;
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
            <div
              key={d}
              className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const dayAppts = appointments.filter((a) =>
              isSameDay(parseISO(a.appointment_date), date),
            );

            const inMonth = isSameMonth(date, currentDate);

            const dateString = format(date, 'yyyy-MM-dd');

            const holiday = holidays.find(
              (holiday) => holiday.date === dateString,
            );

            const schedule = workingHours.find(
              (hours) => hours.day_of_week === date.getDay(),
            ) ?? {
              day_of_week: date.getDay(),
              is_open: date.getDay() !== 0 && date.getDay() !== 6,
              open_time: '09:00',
              close_time: '17:00',
              break_start: null,
              break_end: null,
            };

            const isClosed = !!holiday || !schedule.is_open;
            return (
              <div
                key={date.toISOString()}
                className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                  !inMonth
                    ? 'bg-muted/50'
                    : isClosed
                      ? 'bg-muted/30'
                      : 'bg-background'
                }`}
              >
                <button
                  onClick={() => onSlotClick(date)}
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    format(date, 'yyyy-MM-dd') === businessToday
                      ? 'bg-primary text-white'
                      : inMonth
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground'
                  }`}
                >
                  {format(date, 'd')}
                </button>
                <div className="space-y-1">
                  {isClosed && (
                    <div className="px-1 text-[10px] font-medium text-muted-foreground">
                      {holiday?.name || 'Closed'}
                    </div>
                  )}
                  {dayAppts.slice(0, 3).map((appt) => (
                    <button
                      key={appt.id}
                      onClick={() => onEditAppt(appt)}
                      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
                    >
                      <div className="h-2 w-2 flex-shrink-0 rounded-full" />
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
  workingHours,
  holidays,
  businessToday,
  onSlotClick,
  onEditAppt,
}: {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  workingHours: WorkingHours[];
  holidays: Holiday[];
  businessToday: string;
  onSlotClick: SlotClickHandler;
  onEditAppt: (appt: AppointmentWithRelations) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slots = Array.from({ length: 48 }, (_, index) => ({
    hour: Math.floor(index / 2),
    minute: index % 2 === 0 ? 0 : 30,
  }));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-8 border-b border-border">
          <div className="border-r border-border p-3 text-xs font-semibold text-muted-foreground">
            Time
          </div>
          {days.map((date) => {
            const dateString = format(date, 'yyyy-MM-dd');

            const holiday = holidays.find(
              (holiday) => holiday.date === dateString,
            );

            const schedule = workingHours.find(
              (hours) => hours.day_of_week === date.getDay(),
            ) ?? {
              day_of_week: date.getDay(),
              is_open: date.getDay() !== 0 && date.getDay() !== 6,
              open_time: '09:00',
              close_time: '17:00',
              break_start: null,
              break_end: null,
            };

            const isClosed = !!holiday || !schedule.is_open;

            return (
              <div
                key={date.toISOString()}
                className={`border-r border-border p-3 text-center last:border-r-0 ${
                  isClosed ? 'bg-muted/40' : ''
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(date, 'EEE')}
                </div>
                <div
                  className={`mt-1 text-lg font-bold ${
                    format(date, 'yyyy-MM-dd') === businessToday
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}
                >
                  {format(date, 'd')}
                </div>

                {isClosed && (
                  <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                    {holiday?.name || 'Closed'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
          {slots.map(({ hour, minute }) => (
            <div
              key={`${hour}-${minute}`}
              className="grid grid-cols-8 border-b border-border"
            >
              <div className="border-r border-border p-2 text-xs text-muted-foreground">
                {formatTime(
                  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
                )}
              </div>
              {days.map((date) => {
                const hourAppts = appointments.filter((a) => {
                  if (!isSameDay(parseISO(a.appointment_date), date))
                    return false;
                  const apptHour = parseInt(a.start_time.split(':')[0]);
                  const apptMinute = parseInt(a.start_time.split(':')[1]);
                  const appointmentStart = apptHour * 60 + apptMinute;
                  const slotStart = hour * 60 + minute;
                  return (
                    appointmentStart >= slotStart &&
                    appointmentStart < slotStart + 30
                  );
                });

                const hourIsOpen = isHourWithinWorkingHours(
                  date,
                  hour,
                  minute,
                  workingHours,
                  holidays,
                );
                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[60px] border-r border-border p-1 last:border-r-0 ${
                      hourIsOpen
                        ? 'cursor-pointer hover:bg-muted/50'
                        : 'cursor-not-allowed bg-muted/30'
                    }`}
                    onClick={() => {
                      if (hourIsOpen) {
                        onSlotClick(date, hour, minute);
                      }
                    }}
                  >
                    {hourAppts.map((appt) => (
                      <button
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppt(appt);
                        }}
                        className="mb-1 block w-full rounded-md border-l-2 bg-background p-1.5 text-left text-xs shadow-sm hover:shadow-md"
                      >
                        <div className="font-semibold text-foreground">
                          {formatTime(appt.start_time)}
                        </div>
                        <div className="truncate text-muted-foreground">
                          {appt.customers.full_name}
                        </div>
                        <div className="truncate text-muted-foreground">
                          {appt.services.name}
                        </div>
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
  workingHours,
  holidays,
  onSlotClick,
  onEditAppt,
}: {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  workingHours: WorkingHours[];
  holidays: Holiday[];
  onSlotClick: SlotClickHandler;
  onEditAppt: (appt: AppointmentWithRelations) => void;
}) {
  const slots = Array.from({ length: 48 }, (_, index) => ({
    hour: Math.floor(index / 2),
    minute: index % 2 === 0 ? 0 : 30,
  }));

  const dateString = format(currentDate, 'yyyy-MM-dd');

  const holiday = holidays.find((holiday) => holiday.date === dateString);

  const schedule = workingHours.find(
    (hours) => hours.day_of_week === currentDate.getDay(),
  ) ?? {
    day_of_week: currentDate.getDay(),
    is_open: currentDate.getDay() !== 0 && currentDate.getDay() !== 6,
    open_time: '09:00',
    close_time: '17:00',
    break_start: null,
    break_end: null,
  };

  const isClosed = !!holiday || !schedule.is_open;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border p-4">
          <div className="text-sm font-semibold text-foreground">
            {format(currentDate, 'EEEE, MMMM d')}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isClosed
              ? holiday?.name || 'Closed'
              : `${appointments.length} appointment${
                  appointments.length !== 1 ? 's' : ''
                }`}
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
          {slots.map(({ hour, minute }) => {
            const hourIsOpen = isHourWithinWorkingHours(
              currentDate,
              hour,
              minute,
              workingHours,
              holidays,
            );

            return (
              <div
                key={`${hour}-${minute}`}
                className={`flex border-b border-border ${
                  hourIsOpen ? 'hover:bg-muted/50' : 'bg-muted/30'
                }`}
                onClick={() => {
                  if (hourIsOpen) {
                    onSlotClick(currentDate, hour, minute);
                  }
                }}
              >
                <div className="w-20 flex-shrink-0 border-r border-border p-3 text-xs font-medium text-muted-foreground">
                  {formatTime(
                    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
                  )}
                </div>
                <div className="flex-1 p-2">
                  {appointments
                    .filter((a) => {
                      const [appointmentHour, appointmentMinute] = a.start_time
                        .split(':')
                        .map(Number);
                      const appointmentStart =
                        appointmentHour * 60 + appointmentMinute;
                      const slotStart = hour * 60 + minute;
                      return (
                        appointmentStart >= slotStart &&
                        appointmentStart < slotStart + 30
                      );
                    })
                    .map((appt) => (
                      <button
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppt(appt);
                        }}
                        className="mb-2 block w-full rounded-lg border-l-4 bg-background p-3 text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              {formatTime(appt.start_time)} –{' '}
                              {appt.customers.full_name}
                            </div>
                            <div className="mt-0.5 text-sm text-muted-foreground">
                              {appt.services.name} •{' '}
                              {appt.staff?.full_name || 'Any staff'}
                            </div>
                          </div>
                          <Badge
                            className={STATUS_COLORS[appt.status]}
                            variant="secondary"
                          >
                            {STATUS_LABELS[appt.status]}
                          </Badge>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
          {appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No appointments for this day.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
