import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Generated SQL is a disposable test artifact, never an application migration.
// No test transaction can commit, and it never invokes an email provider.
const migrations = [
  '20260922000000_release_access_status.sql',
  '20260923000000_release_booking_validation.sql',
  '20260923000001_release_status_consumers.sql',
  '20260923000002_release_notification_leases.sql',
  '20260923000003_release_reminder_leases.sql',
  '20260924000000_release_retention_policy.sql',
  '20260924000001_release_reminder_default.sql',
];
const directory = mkdtempSync(join(tmpdir(), 'calora-release-validation-'));
try {
  const tests = readFileSync(resolve('supabase/tests/release-corrections.sql'), 'utf8');
  const assertionCount = (tests.match(/PERFORM pg_temp.check_release\(/g) ?? []).length;
  const sql = ['BEGIN;', "SET LOCAL lock_timeout = '3s';", "SET LOCAL statement_timeout = '30s';",
    ...(process.argv.includes('--applied') ? [] :
      (process.argv.includes('--reminder-default') ? ['20260924000001_release_reminder_default.sql'] : migrations)
        .map(name => readFileSync(resolve('supabase/migrations', name), 'utf8'))),
    tests,
    'ROLLBACK;', "SELECT 'release behavioral assertions passed; fixtures rolled back' AS result, " + assertionCount + " AS assertions_passed;"
  ].join('\n');
  const file = join(directory, 'validation.sql');
  writeFileSync(file, sql);
  const result = spawnSync(process.execPath,
    [resolve('node_modules/supabase/dist/supabase.js'), 'db', 'query', '--linked', '--file', file, '--output', 'json'],
    { stdio: 'inherit', timeout: 90000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
