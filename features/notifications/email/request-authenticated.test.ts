import assert from 'node:assert/strict';
import test from 'node:test';
import { requestAuthenticatedNotification } from './request-authenticated';
import { createRequestClient } from '@/lib/supabase/request-client';

test('both notification helpers transmit the existing session token, not a second session', async () => {
  for (const event of ['cancelled', 'rescheduled']) {
    let calls = 0;
    await requestAuthenticatedNotification('/api/notifications/appointment-' + event, 'appointment-id',
      async () => ({ data: { session: { access_token: 'existing-token' } }, error: null }),
      async (path, init) => {
        calls++;
        assert.equal(path, '/api/notifications/appointment-' + event);
        assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer existing-token');
        assert.deepEqual(JSON.parse(String(init?.body)), { appointmentId: 'appointment-id' });
        return new Response(null, { status: 202 });
      });
    assert.equal(calls, 1);
  }
});

test('missing sessions and session failures do not send or reject appointment operations', async () => {
  let calls = 0;
  const send: typeof fetch = async () => { calls++; throw new Error('must not send'); };
  await requestAuthenticatedNotification('/api/notifications/appointment-cancelled', 'id',
    async () => ({ data: { session: null }, error: null }), send);
  await requestAuthenticatedNotification('/api/notifications/appointment-cancelled', 'id',
    async () => { throw new Error('network'); }, send);
  assert.equal(calls, 0);
});

test('request client verifies the token and preserves user Authorization for RLS reads', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
  const paths: string[] = [];
  globalThis.fetch = async (url, init) => {
    paths.push(String(url));
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer existing-token');
    return Response.json(String(url).includes('/auth/v1/user')
      ? { id: 'test-user', aud: 'authenticated' } : [{ id: 'appointment-id' }]);
  };
  try {
    const client = createRequestClient(new Request('https://calora.test', {
      headers: { authorization: 'Bearer existing-token' },
    }));
    const { data, error } = await client.auth.getUser('existing-token');
    assert.equal(error, null);
    assert.equal(data.user?.id, 'test-user');
    await client.from('appointments').select('id').eq('id', 'appointment-id');
    assert.equal(paths.length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  }
});
