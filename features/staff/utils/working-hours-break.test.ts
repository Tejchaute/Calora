import assert from 'node:assert/strict';
import test from 'node:test';
import { breakPairError } from './working-hours-break';

test('absent and complete breaks are valid', () => {
  assert.equal(breakPairError(null, null), null);
  assert.equal(breakPairError('12:00', '13:00'), null);
});

test('half-defined and reversed breaks cannot be submitted', () => {
  assert.ok(breakPairError('12:00', null));
  assert.ok(breakPairError(null, '13:00'));
  assert.ok(breakPairError('13:00', '13:00'));
  assert.ok(breakPairError('14:00', '13:00'));
  assert.ok(breakPairError('13:00', '13:00:00'));
});
