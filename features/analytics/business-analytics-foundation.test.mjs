import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../../supabase/migrations/20260917000000_business_analytics.sql",
    import.meta.url,
  ),
  "utf8",
);
const service = await readFile(
  new URL("./services/analytics.service.ts", import.meta.url),
  "utf8",
);
const page = await readFile(
  new URL("./components/analytics-page.tsx", import.meta.url),
  "utf8",
);
const trendChart = await readFile(
  new URL("./components/analytics-trend-chart.tsx", import.meta.url),
  "utf8",
);

test("analytics RPC requires authenticated business membership", () => {
  assert.match(migration, /is_business_member_record\(p_business_id\)/);
  assert.match(migration, /REVOKE ALL[\s\S]*FROM anon/);
  assert.match(migration, /GRANT EXECUTE[\s\S]*TO authenticated/);
});

test("all appointment and customer aggregations remain business scoped", () => {
  assert.match(migration, /appointment\.business_id = p_business_id/);
  assert.match(migration, /customer\.business_id = p_business_id/);
  assert.match(migration, /earlier\.business_id = p_business_id/);
});

test("only supported bounded ranges are accepted", () => {
  assert.match(migration, /p_days NOT IN \(1, 7, 30, 90\)/);
  assert.match(service, /AnalyticsRangeDays/);
});

test("report boundaries derive from database time in the business timezone", () => {
  assert.match(
    migration,
    /statement_timestamp\(\) AT TIME ZONE resolved_timezone/,
  );
  assert.match(migration, /period_start := period_end - \(p_days - 1\)/);
  assert.doesNotMatch(service, /Date\.now\(\)/);
});

test("historical outcomes exclude appointments that have not ended", () => {
  assert.match(migration, /appointment\.appointment_date < period_end/);
  assert.match(migration, /appointment\.end_time <= business_now::time/);
  assert.match(migration, /FROM historical_outcomes/);
});

test("cancellation and no-show counts share the explicit ended denominator", () => {
  assert.match(migration, /COUNT\(\*\)::integer AS eligible/);
  assert.match(page, /all appointments that have ended/);
  assert.match(
    page,
    /No appointments have ended[\s\S]*rates are not available/,
  );
});

test("daily trend includes zero-count dates across the complete range", () => {
  assert.match(
    migration,
    /generate_series\(period_start, period_end, interval '1 day'\)/,
  );
  assert.match(migration, /LEFT JOIN period_appointments/);
});

test("service and staff analytics are grouped in the database and bounded", () => {
  assert.match(migration, /GROUP BY appointment\.service_id/);
  assert.match(migration, /GROUP BY appointment\.staff_id/);
  assert.ok((migration.match(/LIMIT 8/g) ?? []).length >= 2);
});

test("new and returning customer definitions are persisted-data based", () => {
  assert.match(
    migration,
    /customer\.created_at AT TIME ZONE resolved_timezone/,
  );
  assert.match(migration, /earlier\.appointment_date < period_start/);
});

test("analytics is read-only and does not expose customer contact fields", () => {
  assert.doesNotMatch(migration, /\b(INSERT|UPDATE|DELETE)\b/);
  assert.doesNotMatch(migration, /customer\.(email|phone|full_name)/);
});

test("chart has an accessible textual data-table equivalent", () => {
  assert.match(trendChart, /View daily data table/);
  assert.match(trendChart, /aria-label=.*Daily appointment counts/);
});
