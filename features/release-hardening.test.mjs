import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('ordinary appointment UI and service no longer expose physical deletion', () => {
  const service = read('features/appointments/services/appointments.service.ts');
  const page = read('features/appointments/components/appointments-page.tsx');
  const table = read('features/appointments/components/appointments-table.tsx');
  assert.doesNotMatch(service, /deleteAppointment|\.delete\(/);
  assert.doesNotMatch(page, /DeleteAppointmentDialog|handleDelete|onDelete/);
  assert.doesNotMatch(table, /onDelete|title="Delete"/);
});

test('prepared access migration preserves rows and denies ordinary destructive privileges', () => {
  const sql = read('supabase/migrations/20260922000000_release_access_status.sql');
  assert.match(sql, /'pending','scheduled','confirmed','completed','cancelled','no_show'/);
  assert.match(sql, /ALTER POLICY profiles_select[^;]+auth\.uid\(\)[^;]+id/);
  assert.match(sql, /cmd IN \('SELECT','ALL'\)/);
  for (const table of ['appointments', 'appointment_lifecycle_events', 'notification_deliveries']) {
    assert.ok(sql.includes('REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.' + table + ' FROM PUBLIC, anon, authenticated'));
  }
  assert.doesNotMatch(sql, /UPDATE public\.appointments|DELETE FROM|TRUNCATE TABLE/);
});

test('working-hours failure restores rows, resets only that day, and keeps an accessible error', () => {
  const page = read('features/staff/components/working-hours-page.tsx');
  assert.match(page, /catch \(error\)[\s\S]*restoreWorkingHoursDay\(current, day, existing\)/);
  assert.match(page, /finally[\s\S]*setSavingDays/);
  assert.match(page, /\[day\]: \(value\[day\] \?\? 0\) \+ 1/);
  assert.match(page, /role="alert"/);
  const table = read('features/staff/components/working-hours-table.tsx');
  assert.equal((table.match(/inputRevision\[day\]/g) ?? []).length, 3);
});

test('server Supabase configuration uses environment rather than a hardcoded project', () => {
  for (const file of ['lib/supabase/server.ts', 'lib/supabase/request-client.ts']) {
    const source = read(file);
    assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    assert.doesNotMatch(source, /https:\/\/[^\s'\"]+\.supabase\.co|sb_publishable_|SUPABASE_SERVICE_ROLE_KEY/);
  }
});
