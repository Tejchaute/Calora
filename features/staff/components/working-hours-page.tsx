'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, CalendarOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { WorkingHoursTable } from './working-hours-table';
import { breakPairError } from '@/features/staff/utils/working-hours-break';
import { HolidayFormDialog } from './holiday-form-dialog';

import {
  getWorkingHoursData,
  upsertWorkingHours,
  deleteHoliday,
} from '../services/working-hours.service';

import type {
  WorkingHours,
  Holiday,
} from '@/types/database';

import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';
import { useBusiness } from '@/features/business/hooks/use-business';
import { restoreWorkingHoursDay } from '../utils/working-hours-state';

export function WorkingHoursPage() {
  const { business, loading: businessLoading } = useBusiness();

  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inputRevision, setInputRevision] = useState<Record<number, number>>({});
  const [savingDays, setSavingDays] = useState<Set<number>>(
    () => new Set()
  );

  const [holidayOpen, setHolidayOpen] = useState(false);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!business?.id) {
      return;
    }

    setLoading(true);

    try {
      const [hoursResult, holidaysResult] =
        await getWorkingHoursData(business.id);

      if (hoursResult.error) {
        handleError(hoursResult.error, {
          fallbackMessage: 'Failed to load working hours',
        });
        return;
      }

      if (holidaysResult.error) {
        handleError(holidaysResult.error, {
          fallbackMessage: 'Failed to load holidays',
        });
        return;
      }

      setHours((hoursResult.data as WorkingHours[]) ?? []);
      setHolidays((holidaysResult.data as Holiday[]) ?? []);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Unexpected error while loading data.',
      });
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    if (!businessLoading) {
      fetchData();
    }
  }, [businessLoading, fetchData]);

  const updateDay = async (
    day: number,
    updates: Partial<WorkingHours>
  ) => {
    if (!business?.id) {
      toast.error('Business not loaded');
      return;
    }

    const existing = hours.find(
      (h) => h.staff_id === null && h.day_of_week === day
    );

    if (savingDays.has(day)) return;

    const nextIsOpen = updates.is_open ?? existing?.is_open ?? true;
    const nextOpenTime = updates.open_time ?? existing?.open_time ?? '09:00';
    const nextCloseTime = updates.close_time ?? existing?.close_time ?? '17:00';

    if (
      nextIsOpen &&
      nextCloseTime <= nextOpenTime
    ) {
      toast.error('Closing time must be later than opening time.');
      setSaveError('Closing time must be later than opening time.');
      setInputRevision(value => ({ ...value, [day]: (value[day] ?? 0) + 1 }));
      return;
    }

    const nextSchedule = {
      is_open: nextIsOpen,
      open_time: nextOpenTime,
      close_time: nextCloseTime,
      break_start:
        updates.break_start !== undefined
          ? updates.break_start || null
          : existing?.break_start ?? null,
      break_end:
        updates.break_end !== undefined
          ? updates.break_end || null
          : existing?.break_end ?? null,
    };

    const breakError = breakPairError(nextSchedule.break_start, nextSchedule.break_end);
    if (breakError) {
      setSaveError(breakError);
      return;
    }

    setSavingDays((current) => new Set(current).add(day));
    const optimisticRow: WorkingHours = {
      id: existing?.id ?? `pending-${day}`,
      business_id: business.id,
      staff_id: null,
      day_of_week: day,
      ...nextSchedule,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setHours((current) => [
      ...current.filter(
        (row) => !(row.staff_id === null && row.day_of_week === day)
      ),
      optimisticRow,
    ].sort((a, b) => a.day_of_week - b.day_of_week));

    setSaveError(null);
    try {
    const { data, error } = await upsertWorkingHours(
      business.id,
      day,
      nextSchedule
    );

    if (error || !data) throw error ?? new Error('No saved working hours returned');
    if (data) {
      setHours((current) => [
        ...current.filter(
          (row) => !(row.staff_id === null && row.day_of_week === day)
        ),
        data as WorkingHours,
      ].sort((a, b) => a.day_of_week - b.day_of_week));

      toast.success(`${format(new Date(2024, 0, day + 7), 'EEEE')} hours saved`);
    }

    } catch (error) {
      setHours(current => restoreWorkingHoursDay(current, day, existing));
      setSaveError('Unable to save your working hours. Previous hours restored. Please try again.');
      handleError(error, { fallbackMessage: 'Unable to save your working hours. Please try again.' });
    } finally {
    setInputRevision(value => ({ ...value, [day]: (value[day] ?? 0) + 1 }));
    setSavingDays((current) => {
      const next = new Set(current);
      next.delete(day);
      return next;
    });
    }
  };

  const handleToggleDay = async (
    day: number,
    isOpen: boolean
  ) => {
    await updateDay(day, {
      is_open: isOpen,
    });
  };

  const handleUpdateDay = async (
    day: number,
    updates: Partial<WorkingHours>
  ) => {
    await updateDay(day, updates);
  };

  const handleDeleteHoliday = async () => {
    if (!business?.id || !deleteHolidayId) {
      return;
    }

    try {
      const { error } = await deleteHoliday(
        business.id,
        deleteHolidayId
      );

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to remove holiday',
        });
        return;
      }

      toast.success('Holiday removed');

      setDeleteHolidayId(null);
      await fetchData();
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to remove holiday',
      });
    }
  };

  if (businessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!business?.id) {
    return (
      <div className="rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">
          Business information is not available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Working Hours
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Set your business opening hours, breaks, and holidays.
          </p>
        </div>
      </div>

      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      <WorkingHoursTable
        inputRevision={inputRevision}
        hours={hours}
        selectedStaffId="business"
        loading={loading}
        savingDays={savingDays}
        onToggleDay={handleToggleDay}
        onUpdateDay={handleUpdateDay}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarOff className="h-5 w-5 text-primary" />
            Holidays & Closed Days
          </CardTitle>

          <Button
            size="sm"
            onClick={() => setHolidayOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add holiday
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-12 w-full"
                />
              ))}
            </div>
          ) : holidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarOff className="h-10 w-10 text-muted-foreground/50" />

              <p className="mt-3 text-sm text-muted-foreground">
                No holidays scheduled.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium text-foreground">
                        {format(
                          parseISO(holiday.date),
                          'MMM d, yyyy'
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {holiday.name || 'Closed'}
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteHolidayId(holiday.id)
                            }
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <HolidayFormDialog
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        onSuccess={fetchData}
      />

      <ConfirmDialog
        open={!!deleteHolidayId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteHolidayId(null);
          }
        }}
        title="Remove holiday?"
        description="The business will be open on this day again."
        confirmLabel="Remove"
        onConfirm={handleDeleteHoliday}
      />
    </div>
  );
}
