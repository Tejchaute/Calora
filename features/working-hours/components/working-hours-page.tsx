'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, Plus, Trash2, CalendarOff, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  getWorkingHoursData,
  upsertWorkingHours,
  addHoliday,
  deleteHoliday,
} from '../services/working-hours.service';
import { getDayName, formatTime } from '@/lib/utils';
import type { WorkingHours, Staff, Holiday } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function WorkingHoursPage() {
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('business');
  const [saving, setSaving] = useState(false);

  // Holiday form
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: wh }, { data: stf }, { data: hols }] = await getWorkingHoursData();
    setHours((wh as WorkingHours[]) || []);
    setStaff(stf || []);
    setHolidays((hols as Holiday[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getHoursForDay = (day: number) => {
    const staffFilter = selectedStaffId === 'business' ? null : selectedStaffId;
    return hours.find((h) => h.staff_id === staffFilter && h.day_of_week === day);
  };

  const updateDay = async (day: number, updates: Partial<WorkingHours>) => {
    const existing = getHoursForDay(day);
    const staffFilter = selectedStaffId === 'business' ? null : selectedStaffId;

    const { error } = await upsertWorkingHours(existing?.id, staffFilter, day, updates);
    if (error) {
      toast.error('Failed to update working hours');
      return;
    }
    fetchData();
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Working hours saved');
    setSaving(false);
  };

  const handleAddHoliday = async () => {
    if (!holidayDate) {
      toast.error('Please select a date');
      return;
    }
    const { error } = await addHoliday(holidayDate, holidayName);
    if (error) {
      toast.error(error.code === '23505' ? 'A holiday already exists on this date' : 'Failed to add holiday');
      return;
    }
    toast.success('Holiday added');
    setHolidayOpen(false);
    setHolidayDate('');
    setHolidayName('');
    fetchData();
  };

  const handleDeleteHoliday = async () => {
    if (!deleteHolidayId) return;
    const { error } = await deleteHoliday(deleteHolidayId);
    if (error) {
      toast.error('Failed to delete holiday');
      return;
    }
    toast.success('Holiday removed');
    setDeleteHolidayId(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Working Hours</h1>
          <p className="mt-1 text-sm text-slate-500">Set your weekly schedule, breaks, and holidays.</p>
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
        </div>
      </div>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-5 w-5 text-blue-600" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS.map((day) => {
                const dayHours = getHoursForDay(day);
                const isBusiness = selectedStaffId === 'business';
                const note = isBusiness
                  ? ''
                  : 'Falls back to business hours if not set';
                return (
                  <div
                    key={day}
                    className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center justify-between sm:w-32">
                      <span className="font-medium text-slate-900">{getDayName(day)}</span>
                      <Switch
                        checked={dayHours?.is_open ?? (day !== 0 && day !== 6)}
                        onCheckedChange={(checked) => updateDay(day, { is_open: checked })}
                      />
                    </div>
                    {dayHours?.is_open ?? (day !== 0 && day !== 6) ? (
                      <div className="flex flex-1 flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-500">Open</Label>
                          <Input
                            type="time"
                            value={dayHours?.open_time ?? '09:00'}
                            onChange={(e) => updateDay(day, { open_time: e.target.value })}
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-500">Close</Label>
                          <Input
                            type="time"
                            value={dayHours?.close_time ?? '17:00'}
                            onChange={(e) => updateDay(day, { close_time: e.target.value })}
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-500">Break</Label>
                          <Input
                            type="time"
                            value={dayHours?.break_start ?? ''}
                            onChange={(e) => updateDay(day, { break_start: e.target.value || null })}
                            className="w-28"
                          />
                          <span className="text-slate-400">–</span>
                          <Input
                            type="time"
                            value={dayHours?.break_end ?? ''}
                            onChange={(e) => updateDay(day, { break_end: e.target.value || null })}
                            className="w-28"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <span className="text-sm text-slate-400">Closed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarOff className="h-5 w-5 text-blue-600" />
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
              <CalendarOff className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No holidays scheduled.</p>
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
                      <TableCell className="font-medium text-slate-900">
                        {format(parseISO(h.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{h.name}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <button
                            onClick={() => setDeleteHolidayId(h.id)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
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

      {/* Holiday Dialog */}
      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="e.g. Christmas, New Year's Day"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayOpen(false)}>Cancel</Button>
            <Button onClick={handleAddHoliday}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
