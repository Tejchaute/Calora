import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node 24 resolves this TypeScript source in its test runner.
import { copyBookingPageUrl, getBookingPageUrl } from './booking-page-url.ts';

test('builds the exact public URL and trims a trailing origin slash', () => {
  assert.equal(getBookingPageUrl('krishna-clinic', 'https://calora.example/'), 'https://calora.example/book/krishna-clinic');
});

test('encodes the public slug and never includes an internal business id', () => {
  const url = getBookingPageUrl('clinic west', 'https://calora.example');
  assert.equal(url, 'https://calora.example/book/clinic%20west');
  assert.equal(url?.includes('business_id'), false);
});

test('does not create a URL without a published slug or origin', () => {
  assert.equal(getBookingPageUrl('', 'https://calora.example'), null);
  assert.equal(getBookingPageUrl('clinic', ''), null);
});

test('copies the exact URL and surfaces clipboard failures', async () => {
  const writes: string[] = [];
  await copyBookingPageUrl('https://calora.example/book/clinic', {
    writeText: async (value) => { writes.push(value); },
  });
  assert.deepEqual(writes, ['https://calora.example/book/clinic']);
  await assert.rejects(copyBookingPageUrl('https://calora.example/book/clinic', {
    writeText: async () => { throw new Error('blocked'); },
  }), /blocked/);
});
