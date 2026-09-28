import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('ambiguous getUser failure never signs out and never grants a user to guards', () => {
  const source = read('providers/auth-provider.tsx');
  assert.match(source, /isInvalidSessionError\(validationError\)/);
  assert.match(source, /clearAuthState\(\);\s*setError\(AuthError\.fromSupabaseError\(validationError\)\)/);
  assert.match(source, /window\.addEventListener\('online', retryWhenOnline\)/);
  assert.match(source, /if \(verificationRetryNeededRef\.current\) void initializeAuth\(\)/);
  assert.match(source, /if \(verifying \|\| verificationRetryNeededRef\.current\)/);
  assert.match(source, /window\.removeEventListener\('online', retryWhenOnline\)/);
});

test('break editor submits both endpoints together and keeps incomplete drafts local', () => {
  const table = read('features/staff/components/working-hours-table.tsx');
  assert.match(table, /breakPairError\(draft\.start \|\| null, draft\.end \|\| null\)/);
  assert.match(table, /if \(!nextError &&[\s\S]*onUpdateDay\(day, \{ break_start: draft\.start \|\| null, break_end: draft\.end \|\| null \}\)/);
  assert.match(table, /role="alert"/);
});

test('timezone reconciliation is pending-only, business-scoped, and guards past or sent reminders', () => {
  const sql = read('supabase/migrations/20260927000001_timezone_reminder_reconciliation.sql');
  assert.match(sql, /delivery\.business_id = NEW\.business_id/);
  assert.match(sql, /delivery\.status_id = pending_status_id/);
  assert.match(sql, /reminder_due_at > pg_catalog\.now\(\)/);
  assert.match(sql, /prior_status\.slug IN \('sent', 'delivered'\)/);
  assert.match(sql, /OLD\.timezone IS DISTINCT FROM NEW\.timezone/);
  assert.match(sql, /SET search_path = ''/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.reconcile_pending_reminders_after_timezone_change/);
});
