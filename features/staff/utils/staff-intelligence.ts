import { getAppointmentTemporalState } from "@/features/appointments/utils/appointment-temporal";
import type {
  AppointmentWithRelations,
  DashboardBusinessClock,
  Staff,
  TimeOff,
} from "@/types/database";

export interface StaffOperationalIntelligence {
  todayAppointmentCount: number;
  upcomingAppointmentCount: number;
  inProgressAppointment: AppointmentWithRelations | null;
  nextAppointment: AppointmentWithRelations | null;
  currentTimeOff: TimeOff | null;
  nextTimeOff: TimeOff | null;
}

export function buildStaffIntelligence(
  staff: Staff[],
  appointments: AppointmentWithRelations[],
  timeOff: TimeOff[],
  clock: DashboardBusinessClock,
) {
  const appointmentsByStaff = groupAppointments(appointments);
  const timeOffByStaff = groupTimeOff(timeOff);
  return new Map(
    staff.map((member) => {
      const memberAppointments = appointmentsByStaff.get(member.id) ?? [];
      const operational = memberAppointments
        .filter(
          (appointment) =>
            (appointment.status === "pending" || appointment.status === "scheduled" ||
              appointment.status === "confirmed") &&
            getAppointmentTemporalState(
              appointment,
              clock.business_date,
              clock.business_time,
            ) !== "past",
        )
        .sort(compareAppointments);
      const memberTimeOff = (timeOffByStaff.get(member.id) ?? []).filter(
        (entry) => entry.status === "approved",
      );
      const value: StaffOperationalIntelligence = {
        todayAppointmentCount: memberAppointments.filter(
          (appointment) => appointment.appointment_date === clock.business_date,
        ).length,
        upcomingAppointmentCount: operational.length,
        inProgressAppointment:
          operational.find(
            (appointment) =>
              getAppointmentTemporalState(
                appointment,
                clock.business_date,
                clock.business_time,
              ) === "in-progress",
          ) ?? null,
        nextAppointment:
          operational.find(
            (appointment) =>
              getAppointmentTemporalState(
                appointment,
                clock.business_date,
                clock.business_time,
              ) === "upcoming",
          ) ?? null,
        currentTimeOff:
          memberTimeOff.find(
            (entry) =>
              entry.start_at <= clock.server_now &&
              entry.end_at > clock.server_now,
          ) ?? null,
        nextTimeOff:
          memberTimeOff
            .filter((entry) => entry.start_at > clock.server_now)
            .sort((a, b) => a.start_at.localeCompare(b.start_at))[0] ?? null,
      };
      return [member.id, value] as const;
    }),
  );
}

function groupAppointments(items: AppointmentWithRelations[]) {
  const grouped = new Map<string, AppointmentWithRelations[]>();
  for (const item of items) {
    if (!item.staff_id) continue;
    grouped.set(item.staff_id, [...(grouped.get(item.staff_id) ?? []), item]);
  }
  return grouped;
}

function groupTimeOff(items: TimeOff[]) {
  const grouped = new Map<string, TimeOff[]>();
  for (const item of items) {
    if (!item.staff_id) continue;
    grouped.set(item.staff_id, [...(grouped.get(item.staff_id) ?? []), item]);
  }
  return grouped;
}

function compareAppointments(
  a: AppointmentWithRelations,
  b: AppointmentWithRelations,
) {
  return `${a.appointment_date}T${a.start_time}`.localeCompare(
    `${b.appointment_date}T${b.start_time}`,
  );
}
