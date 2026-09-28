import { format, getDay } from 'date-fns';
import type { Holiday, WorkingHours } from '@/types/database';

export function getWorkingHoursForDate(
    date: Date,
    workingHours: WorkingHours[]
) {
    const dayOfWeek = getDay(date);

    return (
        workingHours.find(
            (hours) =>
                hours.day_of_week === dayOfWeek &&
                hours.staff_id === null
        ) ?? null
    );
}

export function isHoliday(
    date: Date,
    holidays: Holiday[]
) {
    const dateString = format(date, 'yyyy-MM-dd');

    return holidays.some(
        (holiday) => holiday.date === dateString
    );
}