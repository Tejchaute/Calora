import assert from 'node:assert/strict';
import test from 'node:test';
import { settingsSchema } from './settings.schema';

const validSettings = {
  business_name: 'Krishna Clinic',
  phone: '+91 99999 99999',
  email: 'hello@example.com',
  address: 'Business address',
  logo_url: 'https://example.com/logo.png',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  booking_page_slug: 'krishna-clinic',
};

test('accepts an authoritative supported workspace configuration', () => {
  assert.equal(settingsSchema.safeParse(validSettings).success, true);
});

test('rejects unsupported or non-IANA timezone values', () => {
  for (const timezone of ['', 'IST', 'Browser/Local', 'Asia/Not_A_Zone']) {
    assert.equal(
      settingsSchema.safeParse({ ...validSettings, timezone }).success,
      false
    );
  }
});

test('accepts supported currencies and rejects arbitrary currency input', () => {
  for (const currency of ['INR', 'USD', 'EUR', 'AED']) {
    assert.equal(
      settingsSchema.safeParse({ ...validSettings, currency }).success,
      true
    );
  }
  assert.equal(
    settingsSchema.safeParse({ ...validSettings, currency: 'CALORA' }).success,
    false
  );
});

test('booking identity validation rejects unsafe slugs', () => {
  for (const booking_page_slug of ['Krishna Clinic', '../clinic', 'clinic_name']) {
    assert.equal(
      settingsSchema.safeParse({ ...validSettings, booking_page_slug }).success,
      false
    );
  }
});

test('optional contact fields can remain empty without fabricated data', () => {
  const result = settingsSchema.safeParse({
    ...validSettings,
    phone: '',
    email: '',
    address: '',
    logo_url: '',
  });
  assert.equal(result.success, true);
});
