import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const migrations = [
  '20260926000000_atomic_staff_services.sql',
  '20260926000001_customer_appointment_counts.sql',
  '20260926000002_reminder_reactivation.sql',
];
const directory = mkdtempSync(join(tmpdir(), 'calora-final-p1-'));
try {
  const tests = readFileSync(resolve('supabase/tests/final-p1.sql'), 'utf8');
  const assertions = (tests.match(/PERFORM pg_temp.check_p1\(/g) ?? []).length;
  const sql = [
    'BEGIN;',
    "SET LOCAL lock_timeout = '3s';",
    "SET LOCAL statement_timeout = '120s';",
    ...(process.argv.includes('--applied') ? [] :
      migrations.map((name) => readFileSync(resolve('supabase/migrations', name), 'utf8'))),
    tests,
    'ROLLBACK;',
    `SELECT 'Final P1 assertions passed; fixtures rolled back' AS result, ${assertions} AS assertions_passed;`,
  ].join('\n');
  const file = join(directory, 'validation.sql');
  writeFileSync(file, sql);
  const result = spawnSync(process.execPath,
    [resolve('node_modules/supabase/dist/supabase.js'), 'db', 'query', '--linked', '--file', file, '--output', 'json'],
    { stdio: 'inherit', timeout: 180000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
