import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../migrations/20260913000000_authoritative_working_hours_initialization.sql",
    import.meta.url,
  ),
  "utf8",
);

test("business creation initializes all seven authoritative days", () => {
  const fn = migration.slice(
    migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.create_business_with_owner",
    ),
  );
  assert.match(fn, /INSERT INTO public\.working_hours/);
  assert.match(fn, /generate_series\(0, 6\)/);
  assert.match(fn, /weekday\.day_of_week BETWEEN 1 AND 5/);
  assert.match(fn, /'09:00'::time/);
  assert.match(fn, /'17:00'::time/);
  assert.match(
    fn,
    /ON CONFLICT \(business_id, staff_id, day_of_week\) DO NOTHING/,
  );
  assert.ok(
    fn.indexOf("INSERT INTO public.working_hours") <
      fn.indexOf("RETURN created_business"),
  );
});

test("backfill inserts missing days without updating custom schedules", () => {
  const backfill = migration.slice(
    0,
    migration.indexOf("CREATE OR REPLACE FUNCTION"),
  );
  assert.match(backfill, /generate_series\(0, 6\)/);
  assert.match(
    backfill,
    /ON CONFLICT \(business_id, staff_id, day_of_week\) DO NOTHING/,
  );
  assert.doesNotMatch(backfill, /DO UPDATE/i);
  assert.doesNotMatch(backfill, /UPDATE public\.working_hours/i);
});

test("schedule identity treats null staff as authoritative", () => {
  assert.match(
    migration,
    /working_hours_scope_day_unique[\s\S]*NULLS NOT DISTINCT/,
  );
});
