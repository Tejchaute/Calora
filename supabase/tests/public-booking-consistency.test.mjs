import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../migrations/20260905000000_public_booking_consistency_remediation.sql', import.meta.url),
  'utf8'
);

test('public projections resolve a published active subscription by booking slug', () => {
  assert.match(migration, /settings\.booking_page_slug = btrim\(p_booking_slug\)/);
  assert.match(migration, /business\.status = 'active'/);
  assert.match(migration, /has_active_subscription\(business\.id\)/);
});

test('holiday projection is slug-scoped and limited to the booking horizon', () => {
  assert.match(migration, /FROM public\.business_holidays AS holiday/);
  assert.match(migration, /holiday\.business_id = resolved_business_id/);
  assert.match(migration, /holiday\.date <=/);
});

test('public customer and appointment creation share one transaction', () => {
  const atomicFunction = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.create_public_booking'));
  const customerInsert = atomicFunction.indexOf('INSERT INTO public.customers');
  const appointmentSave = atomicFunction.indexOf('created_appointment := public.save_appointment');

  assert.ok(customerInsert > -1);
  assert.ok(appointmentSave > customerInsert);
  assert.doesNotMatch(atomicFunction, /EXCEPTION\s+WHEN/);
});

test('legacy UUID projection entry points are revoked from browser roles', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_public_booked_slots\(uuid, date, uuid\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.find_or_create_public_customer/);
  assert.match(migration, /DROP POLICY IF EXISTS "business_settings_select_anon"/);
});
