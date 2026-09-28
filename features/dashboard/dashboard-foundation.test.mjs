import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync(
  new URL("./services/dashboard.service.ts", import.meta.url),
  "utf8",
);
const component = readFileSync(
  new URL("./components/dashboard-page.tsx", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260914000000_dashboard_business_clock.sql",
    import.meta.url,
  ),
  "utf8",
);

test("dashboard queries are business scoped, bounded, and avoid per-appointment requests", () => {
  assert.ok(
    (service.match(/\.eq\(["']business_id["'], businessId\)/g) ?? []).length >=
      5,
  );
  assert.match(service, /Promise\.all\(\[/);
  assert.match(service, /\.limit\(100\)/);
  assert.match(service, /\.limit\(8\)/);
  assert.doesNotMatch(service, /for \([^)]*appointment/);
});

test("upcoming query excludes terminal states and uses authoritative business clock", () => {
  assert.match(service, /get_dashboard_business_clock/);
  assert.match(
    service,
    /\.in\(["']status["'], \[["']pending["'], ["']scheduled["'], ["']confirmed["']\]\)/,
  );
  assert.match(service, /end_time\.gt/);
});

test("business clock RPC is member-authorized and timezone-aware", () => {
  assert.match(migration, /is_business_member_record\(p_business_id\)/);
  assert.match(migration, /AT TIME ZONE resolved_timezone/);
  assert.match(migration, /SET search_path = ''/);
  assert.match(migration, /REVOKE ALL[\s\S]*FROM anon/);
});

test("dashboard retains subscription guard and existing appointment mutation RPC", () => {
  assert.match(service, /set_appointment_status/);
  assert.match(component, /SubscriptionStatusCard compact/);
});

test("loading and failure states do not render placeholder zero metrics", () => {
  assert.match(component, /if \(loading && !data\) return <DashboardLoading/);
  assert.match(component, /if \(error && !data\) return <DashboardError/);
  assert.match(component, /Unable to load today/);
});
