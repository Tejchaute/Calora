import { supabase } from '@/lib/supabase/client';
import { requestAuthenticatedNotification } from './request-authenticated';

const APPOINTMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestAppointmentReschedulingEmail(
  appointmentId: string,
): void {
  if (
    typeof window === 'undefined' ||
    !APPOINTMENT_ID_PATTERN.test(appointmentId)
  )
    return;

  void requestAuthenticatedNotification('/api/notifications/appointment-rescheduled', appointmentId, () => supabase.auth.getSession());
}
