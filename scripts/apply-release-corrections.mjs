import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Apply ONLY the reviewed corrective files, atomically, with bounded lock waits.
// The migration ledger is updated in the same transaction, never repaired after
// the fact. An existing version or any SQL error aborts the entire application.
const migrations = [
  '20260922000000_release_access_status.sql',
  '20260923000000_release_booking_validation.sql',
  '20260923000001_release_status_consumers.sql',
  '20260923000002_release_notification_leases.sql',
  '20260923000003_release_reminder_leases.sql',
  '20260924000000_release_retention_policy.sql',
  '20260924000001_release_reminder_default.sql',
];
if (!process.argv.includes('--apply-reviewed-corrections')) {
  throw new Error('Explicit --apply-reviewed-corrections flag required.');
}
const directory = mkdtempSync(join(tmpdir(), 'calora-corrective-apply-'));
try {
  const statements = ["BEGIN;", "SET LOCAL lock_timeout = '3s';", "SET LOCAL statement_timeout = '30s';"];
  const selected = process.argv.includes('--reminder-default')
    ? ['20260924000001_release_reminder_default.sql'] : migrations;
  for (const name of selected) {
    const sql = readFileSync(resolve('supabase/migrations', name), 'utf8');
    const version = name.slice(0, 14);
    const title = name.slice(15, -4);
    const delimiter = '$calora_reviewed_migration$';
    if (sql.includes(delimiter)) throw new Error('Migration delimiter conflict.');
    statements.push(
      "DO $$ BEGIN IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='" + version + "') THEN RAISE EXCEPTION 'Corrective version already applied'; END IF; END $$;",
      sql,
      "INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('" + version + "','" + title + "',ARRAY[" + delimiter + sql + delimiter + "]);",
    );
  }
  statements.push('COMMIT;', "SELECT version,name FROM supabase_migrations.schema_migrations WHERE version >= '20260922000000' ORDER BY version;");
  const file = join(directory, 'apply.sql');
  writeFileSync(file, statements.join('\n'));
  const result = spawnSync(process.execPath,
    [resolve('node_modules/supabase/dist/supabase.js'), 'db', 'query', '--linked', '--file', file, '--output', 'json'],
    { stdio: 'inherit', timeout: 90000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
