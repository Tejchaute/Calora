import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../migrations/20260912000000_business_notification_settings.sql', import.meta.url),
  'utf8',
);

test('adds only the missing rescheduling preference with safe defaults', () => {
  assert.match(
    migration,
    /ADD COLUMN IF NOT EXISTS send_rescheduling boolean NOT NULL DEFAULT true/,
  );
  assert.match(migration, /reminder_hours_before BETWEEN 1 AND 720/);
});

test('owner or admin authority and stale-write protection are server enforced', () => {
  assert.match(migration, /NOT public\.is_business_admin\(target_business_id\)/);
  assert.match(migration, /CALORA_NOTIFICATION_SETTINGS_FORBIDDEN/);
  assert.match(migration, /CALORA_NOTIFICATION_SETTINGS_STALE/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /GRANT EXECUTE[\s\S]*TO authenticated/);
  assert.match(migration, /REVOKE ALL[\s\S]*FROM PUBLIC, anon/);
});

test('disabled settings suppress deliveries without suppressing lifecycle events', () => {
  assert.match(
    migration,
    /BEFORE INSERT ON public\.notification_deliveries/,
  );
  for (const notificationType of [
    'appointment_confirmation',
    'appointment_cancellation',
    'appointment_rescheduling',
    'appointment_reminder',
  ]) {
    assert.match(migration, new RegExp(notificationType));
  }
  assert.doesNotMatch(migration, /DELETE FROM public\.appointment_lifecycle_events/);
});

test('pending disabled deliveries are cancelled and reminder reconciliation remains intact', () => {
  assert.match(migration, /current_status\.slug = 'pending'/);
  assert.match(migration, /failure_category = 'notification_disabled'/);
  assert.match(
    migration,
    /AFTER INSERT OR UPDATE OF[\s\S]*send_reminders[\s\S]*ON public\.notification_settings/,
  );
});

test('settings changes create a minimal business-scoped audit record', () => {
  assert.match(migration, /INSERT INTO public\.audit_logs/);
  assert.match(migration, /'notification_settings\.updated'/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.doesNotMatch(migration, /recipient|email body|api.?key/i);
});
