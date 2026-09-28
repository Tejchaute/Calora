import type { AppointmentWithRelations } from '@/types/database';

export type AppointmentTemporalState = 'past' | 'in-progress' | 'upcoming';

export function getAppointmentTemporalState(
  appointment: Pick<
    AppointmentWithRelations,
    'appointment_date' | 'start_time' | 'end_time'
  >,
  businessDate: string,
  businessTime: string,
): AppointmentTemporalState {
  if (
    appointment.appointment_date < businessDate ||
    (appointment.appointment_date === businessDate &&
      appointment.end_time <= businessTime)
  )
    return 'past';
  if (
    appointment.appointment_date === businessDate &&
    appointment.start_time <= businessTime &&
    appointment.end_time > businessTime
  )
    return 'in-progress';
  return 'upcoming';
}
