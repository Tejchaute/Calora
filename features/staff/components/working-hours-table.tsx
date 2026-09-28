'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDayName } from '@/lib/utils';
import type { WorkingHours } from '@/types/database';
import { breakPairError } from '@/features/staff/utils/working-hours-break';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

function BreakEditor({
  day, start, end, disabled, onUpdateDay,
}: {
  day: number;
  start: string | null;
  end: string | null;
  disabled: boolean;
  onUpdateDay: (day: number, updates: Partial<WorkingHours>) => void;
}) {
  const [draft, setDraft] = useState({ start: start ?? '', end: end ?? '' });
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const nextError = breakPairError(draft.start || null, draft.end || null);
    setError(nextError);
    if (!nextError && (draft.start !== (start ?? '') || draft.end !== (end ?? ''))) {
      onUpdateDay(day, { break_start: draft.start || null, break_end: draft.end || null });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Label htmlFor={`break-start-${day}`} className="text-xs text-muted-foreground">Break</Label>
        <Input id={`break-start-${day}`} type="time" disabled={disabled}
          value={draft.start} aria-invalid={Boolean(error)} aria-describedby={error ? `break-error-${day}` : undefined}
          onChange={(event) => { setDraft(current => ({ ...current, start: event.target.value })); setError(null); }}
          onBlur={commit} className="w-28" />
        <span className="text-muted-foreground">–</span>
        <Input aria-label="Break end" type="time" disabled={disabled}
          value={draft.end} aria-invalid={Boolean(error)} aria-describedby={error ? `break-error-${day}` : undefined}
          onChange={(event) => { setDraft(current => ({ ...current, end: event.target.value })); setError(null); }}
          onBlur={commit} className="w-28" />
      </div>
      {error && <p id={`break-error-${day}`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface WorkingHoursTableProps {
  inputRevision?: Record<number, number>;
  hours: WorkingHours[];
  selectedStaffId: string;
  loading: boolean;
  savingDays: Set<number>;
  onToggleDay: (day: number, isOpen: boolean) => void;
  onUpdateDay: (day: number, updates: Partial<WorkingHours>) => void;
}

export function WorkingHoursTable({
  inputRevision = {},
  hours,
  selectedStaffId,
  loading,
  savingDays,
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
            const isSaving = savingDays.has(day);

            if (!dayHours) {
              return (
                <div
                  key={day}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
                >
                  <div className="font-medium text-foreground sm:w-32">
                    {getDayName(day)}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Not configured</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => onToggleDay(day, day !== 0 && day !== 6)}
                    >
                      {isSaving ? 'Configuring…' : 'Configure'}
                    </Button>
                  </div>
                </div>
              );
            }

            const isOpen = dayHours.is_open;
            return (
              <div
                key={day}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center justify-between sm:w-32">
                  <span className="font-medium text-foreground">{getDayName(day)}</span>
                  <Switch
                    checked={isOpen}
                    disabled={isSaving}
                    onCheckedChange={(checked) => onToggleDay(day, checked)}
                  />
                </div>
                {isOpen ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Open</Label>
                      <Input
                        type="time"
                        disabled={isSaving}
                        key={`open-${inputRevision[day] ?? 0}-${dayHours.open_time}`}
                        defaultValue={dayHours?.open_time ?? '09:00'}
                        onBlur={(e) => {
                          const value = e.target.value;

                          if (value !== (dayHours?.open_time ?? '09:00')) {
                            onUpdateDay(day, { open_time: value });
                          }
                        }}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Close</Label>
                      <Input
                        type="time"
                        disabled={isSaving}
                        key={`close-${inputRevision[day] ?? 0}-${dayHours.close_time}`}
                        defaultValue={dayHours?.close_time ?? '17:00'}
                        onBlur={(e) => {
                          const value = e.target.value;

                          if (value !== (dayHours?.close_time ?? '17:00')) {
                            onUpdateDay(day, { close_time: value });
                          }
                        }}
                        className="w-32"
                      />
                    </div>
                    <BreakEditor
                      key={`break-${inputRevision[day] ?? 0}-${dayHours.break_start}-${dayHours.break_end}`}
                      day={day} start={dayHours.break_start} end={dayHours.break_end}
                      disabled={isSaving} onUpdateDay={onUpdateDay}
                    />
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
