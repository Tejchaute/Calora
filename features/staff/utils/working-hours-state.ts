import type { WorkingHours } from '@/types/database';

export function restoreWorkingHoursDay(
  current: WorkingHours[], day: number, previous: WorkingHours | undefined,
): WorkingHours[] {
  return [
    ...current.filter(row => !(row.staff_id === null && row.day_of_week === day)),
    ...(previous ? [previous] : []),
  ].sort((a, b) => a.day_of_week - b.day_of_week);
}
