import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const service = readFileSync(
  new URL('./services/customers.service.ts', import.meta.url),
  'utf8',
);
const page = readFileSync(
  new URL('./components/customers-page.tsx', import.meta.url),
  'utf8',
);
const detail = readFileSync(
  new URL('./components/customer-detail.tsx', import.meta.url),
  'utf8',
);

test('customer and appointment reads are business scoped and paginated', () => {
  assert.ok(
    (service.match(/\.eq\('business_id', businessId\)/g) ?? []).length >= 3,
  );
  assert.match(service, /\.range\(/);
  assert.match(service, /get_customer_appointment_counts/);
  assert.match(service, /CUSTOMER_HISTORY_PAGE_SIZE/);
  assert.doesNotMatch(service, /for[\s\S]*await/);
});

test('detail reuses authoritative business clock and lifecycle events', () => {
  assert.match(service, /get_dashboard_business_clock/);
  assert.match(service, /appointment_lifecycle_events/);
  assert.match(service, /\.eq\('customer_id', customerId\)/);
  assert.match(service, /\.limit\(50\)/);
  assert.match(detail, /getAppointmentTemporalState/);
});

test('customer history is loaded in bounded pages without cross-customer stale appends', () => {
  assert.match(service, /\.range\(offset, offset \+ CUSTOMER_HISTORY_PAGE_SIZE - 1\)/);
  assert.match(page, /current\?\.customerId === customerId/);
  assert.match(page, /requestId !== detailRequestIdRef\.current/);
  assert.match(detail, /detail\.summary\.total/);
});

test('customer deletion is not exposed by the customer workspace', () => {
  assert.doesNotMatch(service, /\.from\('customers'\)[\s\S]*\.delete\(\)/);
  assert.doesNotMatch(page, /deleteCustomer|DeleteCustomerDialog/);
});

test('customer list has explicit loading, error, search, and bounded intelligence states', () => {
  assert.match(page, /setDebouncedSearch/);
  assert.match(page, /Unable to load customers/);
  assert.match(page, /CustomersTable/);
  assert.match(detail, /CustomerDetailLoading/);
});
