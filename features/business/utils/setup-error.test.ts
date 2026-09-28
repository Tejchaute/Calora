import assert from 'node:assert/strict';
import test from 'node:test';
import { getSetupErrorMessage } from './setup-error';

test('maps duplicate membership errors without exposing database details', () => {
  const message = getSetupErrorMessage({
    code: '23505',
    message: 'duplicate key violates business_members constraint',
  });
  assert.match(message, /already connected to a business/i);
  assert.doesNotMatch(message, /constraint|23505|business_members/i);
});

test('maps authorization and validation failures to actionable copy', () => {
  assert.match(getSetupErrorMessage({ code: '42501' }), /session/i);
  assert.match(getSetupErrorMessage({ code: '22023' }), /business name and type/i);
});

test('maps network failures without claiming creation succeeded', () => {
  assert.match(
    getSetupErrorMessage(new Error('Network request failed')),
    /connection/i
  );
});

test('unknown failures use a safe generic message', () => {
  const message = getSetupErrorMessage(new Error('internal relation secret_table'));
  assert.equal(
    message,
    'Something went wrong. Your business was not created. Please try again.'
  );
});
