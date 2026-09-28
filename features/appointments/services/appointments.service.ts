import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import { requestAppointmentConfirmationEmail } from '@/features/notifications/email/request-confirmation';
import { requestAppointmentCancellationEmail } from '@/features/notifications/email/request-cancellation';
import { requestAppointmentReschedulingEmail } from '@/features/notifications/email/request-rescheduling';
import type { Appointment } from '@/types/database';

const PAGE_SIZE = 10;
export type AppointmentView = 'active' | 'history';

export function isAppointmentConflictError(
  error:
    | {
        code?: string;
        message?: string;
      }
    | null
    | undefined,
) {
  if (!error) return false;

  return (
    error.code === '23P01' ||
    error.code === '23505' ||
    error.message?.includes('CALORA_STAFF_CONFLICT') === true ||
    error.message?.includes('CALORA_TIME_UNAVAILABLE') === true
  );
}

export function getAppointmentAvailabilityMessage(
  error:
    | {
        message?: string;
      }
    | null
    | undefined,
): string | null {
  const message = error?.message || '';

  if (message.includes('CALORA_DURING_BREAK')) {
    return 'This time is during the business break.';
  }
  if (message.includes('CALORA_HOLIDAY')) {
    return 'The business is closed on this date.';
  }
  if (message.includes('CALORA_CLOSED_DAY')) {
    return 'The business is closed on this date.';
  }
  if (message.includes('CALORA_OUTSIDE_WORKING_HOURS')) {
    return 'This time is outside the business working hours.';
  }
  if (message.includes('CALORA_STAFF_NOT_WORKING')) {
    return 'This staff member is not working at the selected time.';
  }
  if (message.includes('CALORA_TIME_OFF')) {
    return 'This time is unavailable because of approved time off.';
  }
  if (message.includes('CALORA_STAFF_SERVICE_UNAVAILABLE')) {
    return 'This staff member is not available for the selected service.';
  }
  if (message.includes('CALORA_STAFF_CONFLICT')) {
    return 'This staff member already has an appointment at this time.';
  }
  if (message.includes('CALORA_TIME_UNAVAILABLE')) {
    return 'This time is no longer available.';
  }
  if (message.includes('CALORA_DURATION_MISMATCH')) {
    return 'The appointment duration must match the selected service.';
  }
  if (message.includes('CALORA_MINIMUM_NOTICE')) {
    return 'This appointment does not meet the minimum booking notice.';
  }
  if (message.includes('CALORA_BOOKING_HORIZON')) {
    return 'This date is outside the available booking window.';
  }
  if (message.includes('CALORA_CUSTOMER_CONTACT_REQUIRED')) {
    return 'Enter a phone number or email address to continue.';
  }
  if (message.includes('CALORA_CUSTOMER_CONFLICT')) {
    return 'These contact details could not be matched safely. Please contact the business.';
  }
  if (message.includes('CALORA_CUSTOMER_INVALID')) {
    return 'Check your contact details and try again.';
  }
  if (
    message.includes('CALORA_BUSINESS_UNAVAILABLE') ||
    message.includes('CALORA_ACCESS_REQUIRED')
  ) {
    return 'This booking page is not currently available.';
  }
  if (message.includes('CALORA_SERVICE_UNAVAILABLE')) {
    return 'The selected service is no longer available.';
  }

  return null;
}

export async function getAppointments({
  businessId,
  page,
  status,
  search,
  view,
}: {
  page: number;
  status?: string;
  search?: string;
  businessId: string;
  view: AppointmentView;
}) {
  const clockResult = await supabase.rpc('get_dashboard_business_clock', {
    p_business_id: businessId,
  });
  if (clockResult.error)
    return { data: null, count: null, error: clockResult.error };
  const clock = Array.isArray(clockResult.data)
    ? clockResult.data[0]
    : clockResult.data;
  if (!clock)
    return {
      data: null,
      count: null,
      error: new Error('Business time is unavailable.'),
    };

  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT, { count: 'exact' });
  query = query.eq('business_id', businessId);

  const activeTimeFilter = `appointment_date.gt.${clock.business_date},and(appointment_date.eq.${clock.business_date},end_time.gt.${clock.business_time})`;
  if (view === 'active') {
    query = query.in('status', ['pending', 'scheduled', 'confirmed']).or(activeTimeFilter);
  } else {
    const historicalTimeFilter = `appointment_date.lt.${clock.business_date},and(appointment_date.eq.${clock.business_date},end_time.lte.${clock.business_time})`;
    query = query.or(
      `status.in.(completed,cancelled,no_show),and(status.in.(pending,scheduled,confirmed),or(${historicalTimeFilter}))`,
    );
  }

  if (status && status !== 'all') {
    query = status === 'pending' ? query.in('status', ['pending', 'scheduled']) : query.eq('status', status);
  }
  if (search) {
    query = query.or(
      `customers.full_name.ilike.%${search}%,services.name.ilike.%${search}%`,
    );
  }

  return query
    .order('appointment_date', { ascending: view === 'active' })
    .order('start_time', { ascending: view === 'active' })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
}

export async function updateAppointmentStatus(
  businessId: string,
  id: string,
  status: Appointment['status'],
) {
  const result = await supabase.rpc('set_appointment_status', {
    p_business_id: businessId,
    p_appointment_id: id,
    p_status: status,
  });
  if (!result.error && status === 'cancelled') {
    requestAppointmentCancellationEmail(id);
  }
  return result;
}


export async function getFormOptions(
  businessId: string,
  appointmentServiceId?: string,
  appointmentStaffId?: string,
) {
  let servicesQuery = supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId);

  if (appointmentServiceId) {
    servicesQuery = servicesQuery.or(
      `status.eq.active,id.eq.${appointmentServiceId}`,
    );
  } else {
    servicesQuery = servicesQuery.eq('status', 'active');
  }

  servicesQuery = servicesQuery.order('name');

  const staffQuery = appointmentServiceId
    ? getStaffForService(businessId, appointmentServiceId, appointmentStaffId)
    : supabase
        .from('staff')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('full_name');

  return Promise.all([
    servicesQuery,
    staffQuery,
    supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('full_name'),
  ]);
}

export async function createCustomerInline(
  businessId: string,
  payload: {
    full_name: string;
    phone: string;
    email: string;
  },
) {
  return supabase
    .from('customers')
    .insert({
      ...payload,
      business_id: businessId,
    })
    .select()
    .single();
}

export async function createAppointment(
  businessId: string,
  payload: Partial<
    Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'business_id'>
  >,
) {
  const result = await supabase.rpc('save_appointment', {
    p_business_id: businessId,
    p_customer_id: payload.customer_id!,
    p_service_id: payload.service_id!,
    p_staff_id: payload.staff_id || null,
    p_appointment_date: payload.appointment_date!,
    p_start_time: payload.start_time!,
    p_end_time: payload.end_time!,
    p_notes: payload.notes || '',
    p_status: payload.status || 'pending',
    p_appointment_id: null,
  });

  const appointment = Array.isArray(result.data) ? result.data[0] : result.data;
  if (
    !result.error &&
    appointment &&
    typeof appointment === 'object' &&
    'id' in appointment
  ) {
    requestAppointmentConfirmationEmail(String(appointment.id));
  }

  return result;
}

export async function updateAppointment(
  businessId: string,
  id: string,
  payload: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>,
) {
  const result = await supabase.rpc('save_appointment', {
    p_business_id: businessId,
    p_customer_id: payload.customer_id!,
    p_service_id: payload.service_id!,
    p_staff_id: payload.staff_id || null,
    p_appointment_date: payload.appointment_date!,
    p_start_time: payload.start_time!,
    p_end_time: payload.end_time!,
    p_notes: payload.notes || '',
    p_status: payload.status || 'pending',
    p_appointment_id: id,
  });
  if (!result.error && payload.status === 'cancelled') {
    requestAppointmentCancellationEmail(id);
  }
  if (!result.error) {
    requestAppointmentReschedulingEmail(id);
  }
  return result;
}

export async function updateAppointmentMetadata(
  businessId: string,
  id: string,
  notes: string,
  status: Appointment['status'],
) {
  const result = await supabase.rpc('update_appointment_metadata', {
    p_business_id: businessId,
    p_appointment_id: id,
    p_notes: notes,
    p_status: status,
  });
  if (!result.error && status === 'cancelled') {
    requestAppointmentCancellationEmail(id);
  }
  return result;
}

export async function getStaffForService(
  businessId: string,
  serviceId: string,
  appointmentStaffId?: string,
) {
  const staffQuery = supabase
    .from('staff')
    .select(
      `
      *,
      staff_services!inner (
        service_id
      )
    `,
    )
    .eq('business_id', businessId)
    .eq('staff_services.service_id', serviceId)
    .order('full_name');

  if (appointmentStaffId) {
    return staffQuery.or(`status.eq.active,id.eq.${appointmentStaffId}`);
  }

  return staffQuery.eq('status', 'active');
}

export { PAGE_SIZE as APPOINTMENTS_PAGE_SIZE };
