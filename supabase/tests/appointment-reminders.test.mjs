import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL(
    '../migrations/20260911000000_automated_appointment_reminders.sql',
    import.meta.url,
  ),
  'utf8',
);
const sentGuardMigration = await readFile(
  new URL(
    '../migrations/20260911000001_reminder_sent_occurrence_guard.sql',
    import.meta.url,
  ),
  'utf8',
);
const recoveryMigration = await readFile(
  new URL(
    '../migrations/20260911000002_reminder_reconciliation_recovery.sql',
    import.meta.url,
  ),
  'utf8',
);

test('reminder policy uses existing settings with a 24-hour default', () => {
  assert.match(migration, /COALESCE\(notification\.send_reminders, true\)/);
  assert.match(
    migration,
    /COALESCE\(notification\.reminder_hours_before, 24\) \* 60/,
  );
  assert.match(migration, /pg_catalog\.make_interval\(mins => lead_minutes\)/);
});

test('due time is calculated from business-local schedule using PostgreSQL timezone conversion', () => {
  assert.match(
    migration,
    /\(appointment_row\.appointment_date \+ appointment_row\.start_time\)\s+AT TIME ZONE business_timezone/,
  );
  assert.match(migration, /appointment_start_at - pg_catalog\.make_interval/);
  assert.doesNotMatch(migration, /Date\.now|localStorage/);
});

test('created and rescheduled events reconcile while cancellation and completion invalidate', () => {
  for (const event of [
    'appointment.created',
    'appointment.rescheduled',
    'appointment.cancelled',
    'appointment.completed',
  ]) {
    assert.ok(migration.includes("'" + event + "'"));
  }
  assert.match(
    migration,
    /appointment_row\.status NOT IN \('pending', 'confirmed'\)/,
  );
  assert.match(
    migration,
    /delivery\.scheduled_for IS DISTINCT FROM appointment_start_at/,
  );
});

test('reminder identity and due lookup are database enforced', () => {
  assert.match(
    migration,
    /'appointment-reminder-email:' \|\| appointment_row\.id::text/,
  );
  assert.match(migration, /ON CONFLICT \(idempotency_key\).*DO UPDATE/s);
  assert.match(migration, /notification_deliveries_due_idx/);
  assert.match(migration, /delivery\.due_at <= pg_catalog\.now\(\)/);
});

test('claim is atomic and processor-time state is revalidated', () => {
  assert.match(migration, /FOR UPDATE OF delivery SKIP LOCKED/);
  assert.match(migration, /appointment_start_at <= pg_catalog\.now\(\)/);
  assert.match(migration, /business\.status = 'active'/);
  assert.match(migration, /public\.has_active_subscription\(business\.id\)/);
  assert.match(
    migration,
    /appointment_row\.status NOT IN \('pending', 'confirmed'\)/,
  );
  assert.match(
    migration,
    /delivery_row\.scheduled_for IS DISTINCT FROM appointment_start_at/,
  );
  assert.match(
    migration,
    /delivery_row\.reminder_lead_minutes IS DISTINCT FROM configured_lead_minutes/,
  );
});

test('missing customer email becomes a non-send state', () => {
  assert.match(
    migration,
    /NULLIF\(pg_catalog\.lower\(pg_catalog\.btrim\(customer\.email\)\), ''\)/,
  );
  assert.match(migration, /failure_category = 'recipient_missing'/);
  assert.match(migration, /status_id = cancelled_status_id/);
});

test('configuration changes deterministically reconcile pending future reminders', () => {
  assert.match(
    migration,
    /AFTER INSERT OR UPDATE OF send_reminders, reminder_hours_before/,
  );
  assert.match(
    migration,
    /public\.reconcile_appointment_email_reminder\(appointment_record\.id\)/,
  );
  assert.match(migration, /reminder_delivery\.status_id = cancelled_status_id/);
});

test('an already-sent reminder is never recreated for the same occurrence', () => {
  assert.match(
    sentGuardMigration,
    /BEFORE INSERT ON public\.notification_deliveries/,
  );
  assert.match(
    sentGuardMigration,
    /delivery\.scheduled_for = NEW\.scheduled_for/,
  );
  assert.match(sentGuardMigration, /status\.slug = 'sent'/);
  assert.match(sentGuardMigration, /RETURN NULL/);
});

test('historical appointments are excluded from migration backfill', () => {
  assert.match(migration, /> pg_catalog\.now\(\)/);
  assert.match(migration, /appointment\.status IN \('pending', 'confirmed'\)/);
});

test('browser roles cannot reconcile or claim reminders', () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.reconcile_appointment_email_reminder\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.claim_due_appointment_email_reminder\(\)[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.claim_due_appointment_email_reminder\(\)[\s\S]*TO service_role/,
  );
});

test('migration does not install cron or a parallel provider', () => {
  assert.doesNotMatch(migration, /pg_cron|cron\.schedule|http_post|resend/i);
});

test('trusted batch processing can recover a reminder missed by failure isolation', () => {
  assert.match(
    recoveryMigration,
    /reconcile_missing_appointment_email_reminders/,
  );
  assert.match(recoveryMigration, /expected_idempotency_key/);
  assert.match(
    recoveryMigration,
    /public\.reconcile_appointment_email_reminder\(appointment_record\.id\)/,
  );
  assert.match(
    recoveryMigration,
    /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    recoveryMigration,
    /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/,
  );
});
