import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { requestAppointmentConfirmationEmail } from '@/features/notifications/email/request-confirmation';
import type { Json } from '@/types/database';

export type PublicBookingContext = {
  server_now: string;
  business_date: string;
  minimum_booking_date: string;
  minimum_booking_time: string;
  maximum_booking_date: string;
  business: { id: string; name: string; slug: string };
  business_settings: {
    business_name: string;
    logo_url: string;
    currency: string;
    timezone: string;
    booking_page_slug: string;
  };
  booking_settings: {
    min_lead_time_hours: number;
    max_advance_days: number;
    buffer_time_minutes: number;
    slot_interval_minutes: number;
    auto_confirm: boolean;
  };
  services: Array<{
    id: string;
    name: string;
    description: string;
    duration: number;
    price: number;
    status: 'active';
  }>;
  staff: Array<{
    id: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    status: 'active';
  }>;
  staff_services: Array<{ staff_id: string; service_id: string }>;
  working_hours: Array<{
    staff_id: string | null;
    day_of_week: number;
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
    break_start: string | null;
    break_end: string | null;
  }>;
  holidays: Array<{ date: string; name: string }>;
};

export function getPublicBookingContext(slug: string) {
  return supabase.rpc('get_public_booking_context', {
    p_booking_slug: slug,
  });
}

export function getBookedSlotsForDate(
  bookingSlug: string,
  date: Date,
  staffId?: string | null,
) {
  return supabase.rpc('get_public_booked_slots', {
    p_booking_slug: bookingSlug,
    p_date: format(date, 'yyyy-MM-dd'),
    p_staff_id: staffId || undefined,
  });
}

export async function createPublicBooking(payload: {
  bookingSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string;
  staffId: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  notes: string;
}) {
  const result = await supabase.rpc('create_public_booking', {
    p_booking_slug: payload.bookingSlug,
    p_customer_name: payload.customerName,
    p_customer_phone: payload.customerPhone.trim(),
    p_customer_email: payload.customerEmail.trim().toLowerCase(),
    p_service_id: payload.serviceId,
    p_staff_id: payload.staffId,
    p_appointment_date: payload.appointmentDate,
    p_start_time: payload.startTime,
    p_end_time: payload.endTime,
    p_notes: payload.notes,
  });

  if (
    !result.error &&
    result.data &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data)
  ) {
    const appointmentId = (result.data as { appointment_id?: Json })
      .appointment_id;
    if (typeof appointmentId === 'string') {
      requestAppointmentConfirmationEmail(appointmentId);
    }
  }

  return result;
}
