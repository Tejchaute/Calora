import assert from 'node:assert/strict';
import test from 'node:test';
import processAppointmentReminders from '../../../netlify/functions/process-appointment-reminders';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.URL;
const originalDeployUrl = process.env.DEPLOY_PRIME_URL;
const originalSecret = process.env.REMINDER_SCHEDULER_SECRET;

function restoreEnvironment() {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.URL;
  else process.env.URL = originalUrl;
  if (originalDeployUrl === undefined) delete process.env.DEPLOY_PRIME_URL;
  else process.env.DEPLOY_PRIME_URL = originalDeployUrl;
  if (originalSecret === undefined) delete process.env.REMINDER_SCHEDULER_SECRET;
  else process.env.REMINDER_SCHEDULER_SECRET = originalSecret;
}

test.afterEach(restoreEnvironment);

test('Netlify schedule invokes only the trusted internal reminder endpoint', async () => {
  process.env.URL = 'https://calora-test.netlify.app';
  process.env.REMINDER_SCHEDULER_SECRET = 'scheduled-function-test-secret';
  let captured: { input: string; init?: RequestInit } | undefined;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init };
    return new Response(
      JSON.stringify({ ok: true, claimed: 1, sent: 1, failed: 0, cancelled: 0 }),
      { status: 200 },
    );
  };

  const response = await processAppointmentReminders();

  assert.equal(response.status, 204);
  assert.equal(
    captured?.input,
    'https://calora-test.netlify.app/api/internal/appointment-reminders',
  );
  assert.equal(captured?.init?.method, 'POST');
  assert.deepEqual(captured?.init?.headers, {
    authorization: 'Bearer scheduled-function-test-secret',
  });
  assert.equal(captured?.init?.body, undefined);
});

test('Netlify schedule fails closed when server configuration is absent', async () => {
  delete process.env.URL;
  delete process.env.DEPLOY_PRIME_URL;
  delete process.env.REMINDER_SCHEDULER_SECRET;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 200 });
  };

  await assert.rejects(
    processAppointmentReminders(),
    /scheduler configuration is unavailable/i,
  );
  assert.equal(calls, 0);
});

test('Netlify reports a failed processor invocation to platform monitoring', async () => {
  process.env.URL = 'https://calora-test.netlify.app';
  process.env.REMINDER_SCHEDULER_SECRET = 'scheduled-function-test-secret';
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Reminder processing failed' }), {
      status: 500,
    });

  await assert.rejects(
    processAppointmentReminders(),
    /processor invocation failed/i,
  );
});
