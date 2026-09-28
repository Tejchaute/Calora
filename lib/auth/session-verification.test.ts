import assert from 'node:assert/strict';
import test from 'node:test';
import { isInvalidSessionError } from './session-verification';

test('a definitive rejection invalidates the local session', () => {
  for (const error of [{ status: 401 }, { status: 403 }, { code: 'bad_jwt' }, { name: 'AuthSessionMissingError' }]) {
    assert.equal(isInvalidSessionError(error), true);
  }
});

test('transport failures and ambiguous server responses keep the SDK session for retry', () => {
  for (const error of [{ status: 0 }, { status: 429 }, { status: 503 }, { code: 'unexpected_failure' }]) {
    assert.equal(isInvalidSessionError(error), false);
  }
});
