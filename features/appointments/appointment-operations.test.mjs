import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const service = readFileSync(
  new URL('./services/appointments.service.ts', import.meta.url),
  'utf8',
);
const page = readFileSync(
  new URL('./components/appointments-page.tsx', import.meta.url),
  'utf8',
);
const calendar = readFileSync(
  new URL('../calendar/services/calendar.service.ts', import.meta.url),
  'utf8',
);
const calendarPage = readFileSync(
  new URL('../calendar/components/calendar-page.tsx', import.meta.url),
  'utf8',
);
const customers = readFileSync(
  new URL('../customers/services/customers.service.ts', import.meta.url),
  'utf8',
);

test('active appointments use authoritative business time and exclude ended appointments', () => {
  assert.match(service, /get_dashboard_business_clock/);
  assert.match(service, /end_time\.gt/);
  assert.match(
    service,
    /\.in\(["']status["'], \[["']pending["'], ["']scheduled["'], ["']confirmed["']\]\)/,
  );
  assert.doesNotMatch(service, /Date\.now\(\)/);
});

test('history includes terminal and past operational records without deletion', () => {
  assert.match(service, /status\.in\.\(completed,cancelled,no_show\)/);
  assert.match(service, /end_time\.lte/);
  assert.match(page, /\[["']active["'], ["']history["']\]/);
  assert.doesNotMatch(service, /end_time[^\n]*delete\(\)/);
});

test('calendar and customer history retain appointments', () => {
  assert.match(calendar, /\.from\('appointments'\)/);
  assert.doesNotMatch(calendar, /\.in\('status'/);
  assert.match(customers, /getCustomerAppointments/);
  assert.match(customers, /\.eq\('customer_id', customerId\)/);
  assert.match(calendar, /get_dashboard_business_clock/);
  assert.match(calendarPage, /businessToday/);
  assert.doesNotMatch(calendarPage, /isToday\(/);
});

test('operational projections remain business scoped and server filtered', () => {
  assert.match(service, /\.eq\(["']business_id["'], businessId\)/);
  assert.match(service, /\.range\(/);
  assert.doesNotMatch(page, /Date\.now\(\)/);
});
