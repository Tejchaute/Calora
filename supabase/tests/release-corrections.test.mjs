import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const booking = read('supabase/migrations/20260923000000_release_booking_validation.sql');
const leases = read('supabase/migrations/20260923000002_release_notification_leases.sql');
const reminders = read('supabase/migrations/20260923000003_release_reminder_leases.sql');

test('reactivation delegates to the one authoritative validator and shares appointment locks', () => {
  assert.match(booking, /RETURN public\.save_appointment_core/);
  assert.equal((booking.match(/hashtextextended\(p_appointment_id::text, 3\)/g) ?? []).length, 3);
  assert.match(booking, /result.status IN \('completed','no_show'\)/);
  assert.match(booking, /p_status IS NULL/);
});
test('approved time off uses business timezone and half-open intervals in both staff paths', () => {
  assert.equal((booking.match(/absence.status = 'approved'/g) ?? []).length, 2);
  assert.equal((booking.match(/absence.end_at > requested_start_at/g) ?? []).length, 2);
  assert.match(booking, /absence.staff_id = candidate.id/);
  assert.match(booking, /absence.staff_id = selected_staff_id/);
  assert.match(booking, /AT TIME ZONE business_timezone/);
  assert.match(read('features/appointments/services/appointments.service.ts'), /message.includes\('CALORA_TIME_OFF'\)/);
});
test('notification leases are bounded, token fenced, and lock claims atomically', () => {
  assert.match(leases, /LIMIT 100 FOR UPDATE OF d SKIP LOCKED/);
  assert.match(leases, /item.attempt_count < 3/);
  assert.match(leases, /interval '23 hours'/);
  assert.match(leases, /delivery.claim_token=target_claim_token/);
  assert.match(leases, /COALESCE\(d.claim_payload,payload\)/);
  assert.match(leases, /delivery.attempt_count <= 1/);
  assert.match(reminders, /FOR UPDATE OF delivery SKIP LOCKED/);
});
test('pre-send validation checks authoritative reschedule eligibility, never React changes', () => {
  assert.match(leases, /newer.event_sequence>e.event_sequence/);
  assert.match(leases, /'appointment.rescheduled','appointment.cancelled','appointment.completed'/);
  assert.match(leases, /a.status IN \('pending','scheduled','confirmed'\)/);
  for (const file of ['processor-core.ts', 'reminder-processor-core.ts']) {
    const source = read('features/notifications/email/' + file);
    assert.ok(source.indexOf('validateClaim(claim.deliveryId)') < source.indexOf('await provider.send('));
  }
});
test('lifecycle recovery reuses existing scheduler with bounded failure-isolated processing', () => {
  const source = read('features/notifications/email/recovery-processor.ts');
  assert.match(source, /rows.slice\(0, 2\)/);
  assert.match(source, /Promise.all/);
  assert.match(source, /catch/);
  assert.match(read('features/notifications/email/reminder-processor.ts'), /processRetryableAppointmentEmails\(\).catch/);
});
