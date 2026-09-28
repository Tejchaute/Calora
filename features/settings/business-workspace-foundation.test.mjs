import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const form = await readFile(new URL('./components/settings-form.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('./components/settings-page.tsx', import.meta.url), 'utf8');
const links = await readFile(new URL('./components/settings-workspace-links.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('./services/settings.service.ts', import.meta.url), 'utf8');
const provider = await readFile(new URL('../../providers/business-provider.tsx', import.meta.url), 'utf8');
const policies = await readFile(
  new URL('../../supabase/migrations/20260731052925_20260731000003_platform_tables.sql', import.meta.url),
  'utf8'
);

test('settings reuse BusinessProvider instead of creating a duplicate settings fetch', () => {
  assert.equal(form.includes('useBusiness()'), true);
  assert.equal(form.includes('getBusinessSettings('), false);
  assert.equal(provider.includes('getBusinessSettingsById'), true);
});

test('business settings writes are scoped and protected against stale overwrites', () => {
  assert.equal(service.includes(".eq('business_id', businessId)"), true);
  assert.equal(service.includes(".eq('updated_at', expectedUpdatedAt)"), true);
  assert.equal(service.includes('CALORA_BUSINESS_SETTINGS_STALE'), true);
  assert.equal(service.includes('.upsert('), false);
});

test('owner and admin editing authority is visible and RLS enforced', () => {
  assert.equal(form.includes("membership?.role === 'owner'"), true);
  assert.equal(form.includes("membership?.role === 'admin'"), true);
  assert.equal(form.includes('Only business owners and administrators'), true);
  const policyStart = policies.indexOf('business_settings_update');
  const policySection = policies.slice(policyStart, policyStart + 400);
  assert.equal(policySection.includes('is_business_admin(business_id)'), true);
});

test('links route to the existing operational authorities', () => {
  for (const route of [
    '/dashboard/working-hours',
    '/dashboard/staff',
    '/dashboard/booking-page',
    '/dashboard/profile',
  ]) {
    assert.equal(links.includes(route), true);
  }
  assert.equal(links.includes("from('working_hours')"), false);
  assert.equal(links.includes("from('time_off')"), false);
});

test('existing notification and subscription authorities remain integrated', () => {
  assert.equal(page.includes('NotificationSettingsCard'), true);
  assert.equal(page.includes('SubscriptionStatusCard'), true);
  assert.equal(page.includes("from('notification_settings')"), false);
  assert.equal(page.includes("from('subscriptions')"), false);
});

test('timezone and currency changes do not mutate appointment timestamps', () => {
  for (const forbidden of ['appointments', 'appointment_date', 'start_time', 'end_time']) {
    assert.equal(service.includes(forbidden), false);
  }
  assert.equal(form.includes('Date.now()'), false);
  assert.equal(form.includes('toISOString()'), false);
  assert.equal(form.includes('Existing appointment times are not rewritten'), true);
});

test('save UX includes validation, dirty state, loading, success, and retry', () => {
  for (const expected of [
    "mode: 'onChange'",
    'isDirty',
    'isSubmitting',
    'isValid',
    'Changes saved',
    'Try again',
  ]) {
    assert.equal(form.includes(expected), true);
  }
});

test('the workspace introduces no payment or billing integration', () => {
  const combined = (form + page + links + service).toLowerCase();
  for (const forbidden of ['stripe', 'checkout', 'invoice', 'billing portal', 'payment intent']) {
    assert.equal(combined.includes(forbidden), false);
  }
});
