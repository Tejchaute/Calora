import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const service = await readFile(
  new URL("./services/staff.service.ts", import.meta.url),
  "utf8",
);
const detail = await readFile(
  new URL("./components/staff-detail.tsx", import.meta.url),
  "utf8",
);
const intelligence = await readFile(
  new URL("./utils/staff-intelligence.ts", import.meta.url),
  "utf8",
);

test("staff operational reads are explicitly business scoped", () => {
  assert.match(service, /\.eq\(["']business_id["'], businessId\)/);
  assert.match(service, /\.eq\(["']staff_id["'], staffId\)/);
});

test("staff list intelligence uses fixed batched queries rather than per-staff reads", () => {
  assert.match(service, /Promise\.all\(\[/);
  assert.doesNotMatch(service, /for \([^)]*staff[^)]*\)[\s\S]{0,200}await/);
});

test("appointment and time-off payloads are bounded", () => {
  assert.match(
    service,
    /\.lte\(["']appointment_date["'], addDays\(clock\.business_date, 30\)\)/,
  );
  assert.match(service, /\.limit\(500\)/);
  assert.match(service, /\.limit\(20\)/);
});

test("shared appointment temporal semantics drive staff intelligence", () => {
  assert.match(intelligence, /getAppointmentTemporalState/);
  assert.match(detail, /getAppointmentTemporalState/);
  assert.doesNotMatch(intelligence, /Date\.now\(\)/);
});

test("working-hours context distinguishes staff-specific from business fallback", () => {
  assert.match(detail, /Staff-specific hours/);
  assert.match(detail, /Business hours apply/);
});

test("staff intelligence does not mutate or delete appointments", () => {
  assert.doesNotMatch(
    service,
    /from\('appointments'\)[\s\S]{0,120}\.(delete|update)\(/,
  );
});
