'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { getDayName } from '@/lib/utils';
import type { WorkingHours } from '@/types/database';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

interface WorkingHoursTableProps {
  hours: WorkingHours[];
  selectedStaffId: string;
  loading: boolean;
  onToggleDay: (day: number, isOpen: boolean) => void;
  onUpdateDay: (day: number, updates: Partial<WorkingHours>) => void;
}

export function WorkingHoursTable({
  hours,
  selectedStaffId,
  loading,
  onToggleDay,
  onUpdateDay,
}: WorkingHoursTableProps) {
  const getHoursForDay = (day: number) => {
    const staffFilter = selectedStaffId === 'business' ? null : selectedStaffId;
    return hours.find((h) => h.staff_id === staffFilter && h.day_of_week === day);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-5 w-5 text-primary" />
          Weekly Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const dayHours = getHoursForDay(day);
            const isOpen = dayHours?.is_open ?? (day !== 0 && day !== 6);
            return (
              <div
                key={day}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center justify-between sm:w-32">
                  <span className="font-medium text-foreground">{getDayName(day)}</span>
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => onToggleDay(day, checked)}
                  />
                </div>
                {isOpen ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Open</Label>
                      <Input
                        type="time"
                        value={dayHours?.open_time ?? '09:00'}
                        onChange={(e) => onUpdateDay(day, { open_time: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Close</Label>
                      <Input
                        type="time"
                        value={dayHours?.close_time ?? '17:00'}
                        onChange={(e) => onUpdateDay(day, { close_time: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Break</Label>
                      <Input
                        type="time"
                        value={dayHours?.break_start ?? ''}
                        onChange={(e) =>
                          onUpdateDay(day, { break_start: e.target.value || null })
                        }
                        className="w-28"
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="time"
                        value={dayHours?.break_end ?? ''}
                        onChange={(e) =>
                          onUpdateDay(day, { break_end: e.target.value || null })
                        }
                        className="w-28"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-sm text-muted-foreground">Closed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
