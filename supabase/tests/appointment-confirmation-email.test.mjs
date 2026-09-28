import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../migrations/20260908000000_appointment_confirmation_email.sql', import.meta.url),
  'utf8'
);

test('only appointment.created enqueues confirmation email work', () => {
  assert.match(migration, /IF lifecycle_event_type = 'appointment\.created' THEN/);
  assert.doesNotMatch(migration, /lifecycle_event_type = 'appointment\.(confirmed|cancelled|rescheduled|completed)' THEN\s+PERFORM public\.enqueue/s);
});

test('delivery and provider idempotency identity is deterministic', () => {
  assert.match(migration, /'appointment-created-email:' \|\| lifecycle_event_id::text/);
  assert.match(migration, /ON CONFLICT \(idempotency_key\).*DO NOTHING/s);
});

test('claiming is concurrency-safe and browser execution is revoked', () => {
  assert.match(migration, /FOR UPDATE OF delivery SKIP LOCKED/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.claim_appointment_created_email\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.claim_appointment_created_email\(uuid\) TO service_role/);
});

test('authoritative recipient is resolved from the appointment customer relationship', () => {
  assert.match(migration, /FROM public\.customers AS customer/);
  assert.match(migration, /customer\.id = delivery_row\.customer_id/);
  assert.match(migration, /customer\.business_id = delivery_row\.business_id/);
});
