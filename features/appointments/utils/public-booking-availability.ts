import { addDays, format, parseISO } from "date-fns";

export function getPublicBookingDateRange(
  businessDate: string,
  maxAdvanceDays: number,
): Date[] {
  const start = parseISO(`${businessDate}T12:00:00`);
  const safeHorizon = Math.max(0, Math.floor(maxAdvanceDays));
  return Array.from({ length: safeHorizon + 1 }, (_, index) =>
    addDays(start, index),
  );
}

export function isSlotAtOrAfterMinimumNotice({
  appointmentDate,
  startTime,
  minimumBookingDate,
  minimumBookingTime,
}: {
  appointmentDate: Date;
  startTime: string;
  minimumBookingDate: string;
  minimumBookingTime: string;
}): boolean {
  const requestedDate = format(appointmentDate, "yyyy-MM-dd");
  const requestedTime =
    startTime.length === 5 ? `${startTime}:00` : startTime.slice(0, 8);
  const thresholdTime = minimumBookingTime.slice(0, 8);

  if (requestedDate !== minimumBookingDate)
    return requestedDate > minimumBookingDate;
  return requestedTime >= thresholdTime;
}

type TimeRangeOverlapInput = {
  candidateStart: string;
  candidateEnd: string;
  existingStart: string;
  existingEnd: string;
  bufferMinutes?: number;
};

export function timeToSeconds(value: string): number {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export function isSlotWithinWorkingHours({
  slotStart,
  slotEnd,
  openTime,
  closeTime,
  breakStart,
  breakEnd,
}: {
  slotStart: string;
  slotEnd: string;
  openTime: string | null;
  closeTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
}): boolean {
  const start = timeToSeconds(slotStart);
  const end = timeToSeconds(slotEnd);
  return (!openTime || start >= timeToSeconds(openTime)) &&
    (!closeTime || end <= timeToSeconds(closeTime)) &&
    !(breakStart && breakEnd && timeToSeconds(breakStart) < end && timeToSeconds(breakEnd) > start);
}

/**
 * Mirrors save_appointment()'s strict [start, end) overlap predicate.
 * PostgreSQL time values may arrive as HH:mm:ss while generated slots use HH:mm,
 * so comparisons must use normalized numeric values rather than raw strings.
 */
export function doAppointmentTimeRangesOverlap({
  candidateStart,
  candidateEnd,
  existingStart,
  existingEnd,
  bufferMinutes = 0,
}: TimeRangeOverlapInput): boolean {
  const bufferSeconds = Math.max(0, bufferMinutes) * 60;

  return (
    timeToSeconds(existingStart) <
      timeToSeconds(candidateEnd) + bufferSeconds &&
    timeToSeconds(existingEnd) > timeToSeconds(candidateStart) - bufferSeconds
  );
}
