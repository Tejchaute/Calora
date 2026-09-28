import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../migrations/20260907000000_appointment_notification_event_foundation.sql', import.meta.url),
  'utf8'
);
const hardeningMigration = readFileSync(
  new URL('../migrations/20260907000001_notification_foundation_hardening.sql', import.meta.url),
  'utf8'
);
const appointmentService = readFileSync(
  new URL('../../features/appointments/services/appointments.service.ts', import.meta.url),
  'utf8'
);
const publicBookingService = readFileSync(
  new URL('../../features/appointments/services/booking.service.ts', import.meta.url),
  'utf8'
);

test('supports the required typed appointment lifecycle events', () => {
  for (const eventType of ['created', 'confirmed', 'cancelled', 'rescheduled', 'completed']) {
    assert.match(migration, new RegExp(`'appointment\\.${eventType}'`));
  }
});

test('successful authoritative appointment writes emit events after persistence', () => {
  assert.match(migration, /AFTER INSERT OR UPDATE ON public\.appointments/);
  assert.match(migration, /TG_OP = 'INSERT'[\s\S]*'appointment\.created'/);
});

test('failed appointment writes cannot leave successful events', () => {
  assert.doesNotMatch(migration, /EXCEPTION\s+WHEN[\s\S]*appointment_lifecycle_events/);
  assert.match(migration, /AFTER INSERT OR UPDATE ON public\.appointments/);
});

test('status transitions emit confirmed, cancelled and completed events only on change', () => {
  assert.match(migration, /OLD\.status IS DISTINCT FROM NEW\.status/);
  assert.match(migration, /NEW\.status = 'confirmed'[\s\S]*appointment\.confirmed/);
  assert.match(migration, /NEW\.status = 'cancelled'[\s\S]*appointment\.cancelled/);
  assert.match(migration, /NEW\.status = 'completed'[\s\S]*appointment\.completed/);
});

test('reschedules are detected without creating a customer reschedule operation', () => {
  assert.match(migration, /OLD\.appointment_date, OLD\.start_time, OLD\.end_time, OLD\.staff_id, OLD\.service_id/);
  assert.match(migration, /'appointment\.rescheduled'/);
});

test('event and future delivery idempotency are database-enforced', () => {
  assert.match(migration, /UNIQUE \(appointment_id, event_sequence\)/);
  assert.match(migration, /appointment_lifecycle_created_once_idx/);
  assert.match(migration, /notification_deliveries_event_recipient_unique/);
  assert.match(migration, /notification_deliveries_idempotency_key_unique/);
});

test('events and delivery writes are business isolated from browser roles', () => {
  assert.match(migration, /USING \(public\.is_business_member_record\(business_id\)\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.appointment_lifecycle_events FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.appointment_lifecycle_events TO authenticated/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.notification_deliveries FROM PUBLIC, anon, authenticated/);
  assert.match(hardeningMigration, /REVOKE SELECT ON TABLE public\.notification_deliveries FROM PUBLIC, anon/);
  assert.match(hardeningMigration, /GRANT SELECT ON TABLE public\.notification_deliveries TO authenticated/);
});

test('the redundant lifecycle sequence index is removed', () => {
  assert.match(hardeningMigration, /DROP INDEX IF EXISTS public\.appointment_lifecycle_events_appointment_idx/);
});

test('event rows bind customer, appointment and business through foreign keys', () => {
  assert.match(migration, /business_id uuid NOT NULL REFERENCES public\.businesses/);
  assert.match(migration, /appointment_id uuid NOT NULL REFERENCES public\.appointments/);
  assert.match(migration, /customer_id uuid NOT NULL REFERENCES public\.customers/);
});

test('event payload excludes contact details and authentication material', () => {
  const tableDefinition = migration.slice(
    migration.indexOf('CREATE TABLE public.appointment_lifecycle_events'),
    migration.indexOf('CREATE UNIQUE INDEX appointment_lifecycle_created_once_idx')
  );
  assert.doesNotMatch(tableDefinition, /email|phone|token|session|password/i);
});

test('React-facing services do not emit lifecycle events', () => {
  assert.doesNotMatch(appointmentService, /appointment_lifecycle_events|record_appointment_lifecycle_event/);
  assert.doesNotMatch(publicBookingService, /appointment_lifecycle_events|record_appointment_lifecycle_event/);
});
