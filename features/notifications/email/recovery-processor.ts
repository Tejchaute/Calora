import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { processAppointmentEmail } from './processor';

// Reuse the authenticated internal scheduler; no new endpoint or schedule.
// Two parallel sends keep this recovery batch below the existing request budget.
export async function processRetryableAppointmentEmails(): Promise<void> {
  const { data, error } = await createAdminClient().rpc('list_retryable_appointment_emails');
  if (error) throw new Error('Unable to load retryable notification deliveries.');
  const rows: { appointment_id: string; event_type: string }[] = data ?? [];
  await Promise.all(rows.slice(0, 2).map(async row => {
    if (row.event_type !== 'appointment.created' &&
        row.event_type !== 'appointment.cancelled' &&
        row.event_type !== 'appointment.rescheduled') return;
    try {
      await processAppointmentEmail(row.appointment_id, row.event_type);
    } catch {
      // Durable lease expiry makes abandoned work available to a later run.
      console.warn('Appointment email recovery deferred.');
    }
  }));
}
