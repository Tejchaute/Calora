import assert from 'node:assert/strict';
import test from 'node:test';
import { businessSetupSchema } from './business-setup.schema';

const businessTypeId = '11111111-1111-4111-8111-111111111111';

test('accepts and normalizes the two authoritative setup fields', () => {
  const result = businessSetupSchema.safeParse({
    businessName: '  Krishna Clinic  ',
    businessTypeId,
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.businessName, 'Krishna Clinic');
});

test('business name is required and bounded by the RPC limit', () => {
  assert.equal(
    businessSetupSchema.safeParse({ businessName: ' ', businessTypeId }).success,
    false
  );
  assert.equal(
    businessSetupSchema.safeParse({
      businessName: 'a'.repeat(121),
      businessTypeId,
    }).success,
    false
  );
});

test('business name must be capable of producing the existing ASCII slug', () => {
  assert.equal(
    businessSetupSchema.safeParse({ businessName: '---', businessTypeId }).success,
    false
  );
});

test('business type must be an authoritative UUID', () => {
  for (const businessTypeId of ['', 'clinic', 'not-a-uuid']) {
    assert.equal(
      businessSetupSchema.safeParse({
        businessName: 'Krishna Clinic',
        businessTypeId,
      }).success,
      false
    );
  }
});
