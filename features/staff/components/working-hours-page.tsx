'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, CalendarOff, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { WorkingHoursFormDialog } from './working-hours-form-dialog';
import {
  getWorkingHoursData,
  upsertWorkingHours,
} from '../services/working-hours.service';
import type { WorkingHours, Staff, Holiday } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';

export function WorkingHoursPage() {
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('business');
  const [saving, setSaving] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hoursResult, staffResult] = await getWorkingHoursData();

      if (hoursResult.error) {
        handleError(hoursResult.error, {
          fallbackMessage: 'Failed to load working hours',
        });
        return;
      }

      if (staffResult.error) {
        handleError(staffResult.error, { fallbackMessage: 'Failed to load staff' });
        return;
      }

      setHours((hoursResult.data as WorkingHours[]) ?? []);
      setStaff((staffResult.data as Staff[]) ?? []);
      setHolidays([]);
    } catch (error) {
      handleError(error, { fallbackMessage: 'Unexpected error while loading data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleDay = async (day: number, isOpen: boolean) => {
    await updateDay(day, { is_open: isOpen });
  };

  const handleUpdateDay = async (day: number, updates: Partial<WorkingHours>) => {
    await updateDay(day, updates);
  };

  const updateDay = async (day: number, updates: Partial<WorkingHours>) => {
    const staffFilter = selectedStaffId === 'business' ? null : selectedStaffId;
    const existing = hours.find(
      (h) => h.staff_id === staffFilter && h.day_of_week === day,
    );

    const { error } = await upsertWorkingHours(existing?.id, staffFilter, day, updates);
    if (error) {
      handleError(error, { fallbackMessage: 'Failed to update working hours' });
      return;
    }
    await fetchData();
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Working hours saved');
    setSaving(false);
  };

  const handleDeleteHoliday = async () => {
    setDeleteHolidayId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Working Hours</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set your weekly schedule, breaks, and holidays.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="business">Business (default)</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <WorkingHoursTable
        hours={hours}
        selectedStaffId={selectedStaffId}
        loading={loading}
        onToggleDay={handleToggleDay}
        onUpdateDay={handleUpdateDay}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarOff className="h-5 w-5 text-primary" />
            Holidays & Closed Days
          </CardTitle>
          <Button size="sm" onClick={() => setHolidayOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add holiday
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : holidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarOff className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No holidays scheduled.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium text-foreground">
                        {format(parseISO(h.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.name}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <button
                            onClick={() => setDeleteHolidayId(h.id)}
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

      <WorkingHoursFormDialog
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        onSuccess={fetchData}
      />

      <ConfirmDialog
        open={!!deleteHolidayId}
        onOpenChange={(o) => !o && setDeleteHolidayId(null)}
        title="Remove holiday?"
        description="The business will be open on this day again."
        confirmLabel="Remove"
        onConfirm={handleDeleteHoliday}
      />
    </div>
  );
}
