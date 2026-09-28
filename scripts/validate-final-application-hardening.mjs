import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const migrations = [
  '20260927000000_working_hours_break_pair.sql',
  '20260927000001_timezone_reminder_reconciliation.sql',
];
const directory = mkdtempSync(join(tmpdir(), 'calora-application-hardening-'));
try {
  const tests = readFileSync(resolve('supabase/tests/final-application-hardening.sql'), 'utf8');
  const assertions = (tests.match(/PERFORM pg_temp.check_hardening\(/g) ?? []).length;
  const sql = [
    'BEGIN;',
    "SET LOCAL lock_timeout = '3s';",
    "SET LOCAL statement_timeout = '120s';",
    ...(process.argv.includes('--applied') ? [] :
      migrations.map(name => readFileSync(resolve('supabase/migrations', name), 'utf8'))),
    tests,
    'ROLLBACK;',
    `SELECT 'Application-hardening assertions passed; fixtures rolled back' AS result, ${assertions} AS assertions_passed;`,
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
