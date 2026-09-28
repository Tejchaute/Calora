import { getAppointmentTemporalState } from '@/features/appointments/utils/appointment-temporal';
import type {
  AppointmentWithRelations,
  Customer,
  DashboardBusinessClock,
} from '@/types/database';
import type { CustomerWithIntelligence } from '../services/customers.service';

export function buildCustomerIntelligence(
  customers: Customer[],
  appointments: AppointmentWithRelations[],
  clock: DashboardBusinessClock,
): CustomerWithIntelligence[] {
  const byCustomer = new Map<string, AppointmentWithRelations[]>();
  for (const appointment of appointments) {
    const items = byCustomer.get(appointment.customer_id) ?? [];
    items.push(appointment);
    byCustomer.set(appointment.customer_id, items);
  }

  return customers.map((customer) => {
    const customerAppointments = byCustomer.get(customer.id) ?? [];
    const operational = customerAppointments
      .filter(
        (appointment) =>
          (appointment.status === 'pending' || appointment.status === 'scheduled' ||
            appointment.status === 'confirmed') &&
          getAppointmentTemporalState(
            appointment,
            clock.business_date,
            clock.business_time,
          ) !== 'past',
      )
      .sort(compareAppointmentsAscending);

    return {
      ...customer,
      appointment_count: customerAppointments.length,
      completed_count: customerAppointments.filter(
        (appointment) => appointment.status === 'completed',
      ).length,
      cancelled_count: customerAppointments.filter(
        (appointment) => appointment.status === 'cancelled',
      ).length,
      next_appointment: operational[0] ?? null,
      last_appointment:
        customerAppointments
          .filter(
            (appointment) =>
              getAppointmentTemporalState(
                appointment,
                clock.business_date,
                clock.business_time,
              ) === 'past',
          )
          .sort(compareAppointmentsDescending)[0] ?? null,
    };
  });
}

function appointmentKey(appointment: AppointmentWithRelations) {
  return `${appointment.appointment_date}T${appointment.start_time}`;
}

function compareAppointmentsAscending(
  left: AppointmentWithRelations,
  right: AppointmentWithRelations,
) {
  return appointmentKey(left).localeCompare(appointmentKey(right));
}

function compareAppointmentsDescending(
  left: AppointmentWithRelations,
  right: AppointmentWithRelations,
) {
  return appointmentKey(right).localeCompare(appointmentKey(left));
}
