import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL(
    '../migrations/20260910000000_appointment_rescheduling_email.sql',
    import.meta.url,
  ),
  'utf8',
);
const foundation = await readFile(
  new URL(
    '../migrations/20260907000000_appointment_notification_event_foundation.sql',
    import.meta.url,
  ),
  'utf8',
);
const route = await readFile(
  new URL(
    '../../app/api/notifications/appointment-rescheduled/route.ts',
    import.meta.url,
  ),
  'utf8',
);
const appointmentService = await readFile(
  new URL(
    '../../features/appointments/services/appointments.service.ts',
    import.meta.url,
  ),
  'utf8',
);

test('authoritative reschedule semantics exclude status and metadata-only updates', () => {
  assert.match(
    foundation,
    /\(OLD\.appointment_date, OLD\.start_time, OLD\.end_time, OLD\.staff_id, OLD\.service_id\)/,
  );
  assert.match(foundation, /'appointment\.rescheduled'/);
});

test('reschedule delivery is transactionally downstream of the lifecycle event', () => {
  assert.match(
    migration,
    /AFTER INSERT ON public\.appointment_lifecycle_events/,
  );
  assert.match(
    migration,
    /WHEN \(NEW\.event_type = 'appointment\.rescheduled'\)/,
  );
  assert.match(
    migration,
    /'appointment-rescheduled-email:' \|\| NEW\.id::text/,
  );
  assert.match(migration, /ON CONFLICT \(idempotency_key\).*DO NOTHING/s);
});

test('claim uses authoritative recipient and preserved previous schedule', () => {
  assert.match(migration, /customer\.id = delivery_row\.customer_id/);
  assert.match(migration, /customer\.business_id = delivery_row\.business_id/);
  assert.match(migration, /event\.metadata ->> 'previous_appointment_date'/);
  assert.match(migration, /event\.metadata ->> 'previous_start_time'/);
  assert.match(migration, /'appointment_date', event\.appointment_date/);
  assert.match(migration, /'start_time', event\.start_time/);
});

test('reschedule claim is concurrency-safe and service-role only', () => {
  assert.match(migration, /FOR UPDATE OF delivery SKIP LOCKED/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.claim_appointment_rescheduled_email\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.claim_appointment_rescheduled_email\(uuid\)[\s\S]*TO service_role/,
  );
});

test('processing endpoint requires authentication and RLS-visible appointment access', () => {
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /if \(!token\).*status: 401/);
  assert.match(
    route,
    /\.from\('appointments'\)[\s\S]*\.eq\('id', appointmentId\)/,
  );
  assert.match(
    route,
    /processAppointmentEmail\(appointmentId, 'appointment\.rescheduled'\)/,
  );
  assert.doesNotMatch(route, /toEmail|recipientEmail|subject|html/);
});

test('authenticated reschedule requests processing only after authoritative RPC success', () => {
  assert.match(
    appointmentService,
    /const result = await supabase\.rpc\('save_appointment'/,
  );
  assert.match(
    appointmentService,
    /if \(!result\.error\) \{\s*requestAppointmentReschedulingEmail\(id\)/,
  );
  assert.doesNotMatch(
    appointmentService,
    /appointment_lifecycle_events|enqueue_appointment_rescheduled_email/,
  );
});
