import type { AppointmentWithRelations } from "@/types/database";

export type TodayStatusCounts = {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
};

export function getTodayStatusCounts(
  appointments: AppointmentWithRelations[],
): TodayStatusCounts {
  return appointments.reduce<TodayStatusCounts>(
    (counts, appointment) => {
      counts.total += 1;
      switch (appointment.status) {
        case "scheduled":
          counts.pending += 1;
          break;
        case "confirmed":
        case "pending":
        case "completed":
        case "cancelled":
          counts[appointment.status] += 1;
          break;
      }
      return counts;
    },
    { total: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0 },
  );
}

export function getNextOperationalAppointment(
  appointments: AppointmentWithRelations[],
) {
  return (
    appointments.find(
      (appointment) =>
        appointment.status === "pending" || appointment.status === "scheduled" || appointment.status === "confirmed",
    ) ?? null
  );
}

export function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
