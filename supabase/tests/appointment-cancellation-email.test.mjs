import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL(
    '../migrations/20260909000000_appointment_cancellation_email.sql',
    import.meta.url,
  ),
  'utf8',
);
const completionMigration = await readFile(
  new URL(
    '../migrations/20260909000001_appointment_email_completion_generalization.sql',
    import.meta.url,
  ),
  'utf8',
);
const cancellationRoute = await readFile(
  new URL(
    '../../app/api/notifications/appointment-cancelled/route.ts',
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
const dashboardService = await readFile(
  new URL(
    '../../features/dashboard/services/dashboard.service.ts',
    import.meta.url,
  ),
  'utf8',
);

test('only authoritative cancelled events enqueue cancellation email work', () => {
  assert.match(
    migration,
    /ELSIF lifecycle_event_type = 'appointment\.cancelled' THEN/,
  );
  assert.match(
    migration,
    /public\.enqueue_appointment_cancelled_email\(event_id, appointment_row\)/,
  );
  assert.doesNotMatch(
    migration,
    /lifecycle_event_type = 'appointment\.(confirmed|rescheduled|completed)' THEN\s+PERFORM public\.enqueue_appointment_cancelled_email/s,
  );
});

test('cancellation delivery identity is deterministic and database-enforced', () => {
  assert.match(
    migration,
    /'appointment-cancelled-email:' \|\| lifecycle_event_id::text/,
  );
  assert.match(migration, /ON CONFLICT \(idempotency_key\).*DO NOTHING/s);
});

test('generic claim is concurrency-safe, event-filtered and service-role only', () => {
  assert.match(migration, /event\.event_type = target_event_type/);
  assert.match(migration, /FOR UPDATE OF delivery SKIP LOCKED/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.claim_appointment_email\(uuid, text\)[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.claim_appointment_email\(uuid, text\) TO service_role/,
  );
});

test('generic completion remains service-role only and uses lifecycle-neutral failures', () => {
  assert.match(
    completionMigration,
    /Appointment email could not be delivered\./,
  );
  assert.match(
    completionMigration,
    /REVOKE ALL ON FUNCTION public\.complete_appointment_email[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    completionMigration,
    /GRANT EXECUTE ON FUNCTION public\.complete_appointment_email[\s\S]*TO service_role/,
  );
});

test('recipient and original scheduled details are authoritative', () => {
  assert.match(migration, /customer\.id = delivery_row\.customer_id/);
  assert.match(migration, /customer\.business_id = delivery_row\.business_id/);
  assert.match(migration, /'appointment_date', event\.appointment_date/);
  assert.match(migration, /'start_time', event\.start_time/);
  assert.match(migration, /'timezone', COALESCE\(NULLIF\(event\.timezone/);
});

test('cancellation processing requires authentication and RLS-visible appointment access', () => {
  assert.match(cancellationRoute, /auth\.getUser\(token\)/);
  assert.match(cancellationRoute, /if \(!token\).*status: 401/);
  assert.match(
    cancellationRoute,
    /\.from\('appointments'\)[\s\S]*\.eq\('id', appointmentId\)/,
  );
  assert.match(
    cancellationRoute,
    /processAppointmentEmail\(appointmentId, 'appointment\.cancelled'\)/,
  );
  assert.doesNotMatch(cancellationRoute, /toEmail|recipientEmail|subject|html/);
});

test('all authenticated cancellation callers request the same downstream processor only after RPC success', () => {
  for (const source of [appointmentService, dashboardService]) {
    assert.match(source, /!result\.error && status === ["']cancelled["']/);
    assert.match(source, /requestAppointmentCancellationEmail\(id\)/);
    assert.doesNotMatch(
      source,
      /appointment_lifecycle_events|enqueue_appointment_cancelled_email/,
    );
  }
});
