import assert from 'node:assert/strict';
import test from 'node:test';
import { handleReminderSchedulerRequest } from './reminder-scheduler-handler';

const secret = 'test-scheduler-secret-with-at-least-32-characters';
const emptyResult = { claimed: 0, sent: 0, failed: 0, cancelled: 0 };

function request(
  authorization?: string,
  method = 'POST',
  body?: Record<string, unknown>,
) {
  return new Request('http://localhost/api/internal/appointment-reminders', {
    method,
    headers: authorization ? { authorization } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('authorized scheduler invocation reaches the reminder processor', async () => {
  let calls = 0;
  const response = await handleReminderSchedulerRequest(
    request('Bearer ' + secret),
    {
      secret,
      async processReminders() {
        calls += 1;
        return { claimed: 2, sent: 1, failed: 0, cancelled: 1 };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(await response.json(), {
    ok: true,
    claimed: 2,
    sent: 1,
    failed: 0,
    cancelled: 1,
  });
});

test('anonymous and invalid credentials cannot invoke processing', async () => {
  let calls = 0;
  const processReminders = async () => {
    calls += 1;
    return emptyResult;
  };

  const anonymous = await handleReminderSchedulerRequest(request(), {
    secret,
    processReminders,
  });
  const invalid = await handleReminderSchedulerRequest(
    request('Bearer wrong-secret'),
    { secret, processReminders },
  );

  assert.equal(anonymous.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(calls, 0);
});

test('missing server configuration and unsupported methods fail closed', async () => {
  const missingConfiguration = await handleReminderSchedulerRequest(
    request('Bearer ' + secret),
    { secret: undefined, processReminders: async () => emptyResult },
  );
  const get = await handleReminderSchedulerRequest(
    request('Bearer ' + secret, 'GET'),
    { secret, processReminders: async () => emptyResult },
  );

  assert.equal(missingConfiguration.status, 503);
  assert.equal(get.status, 405);
});

test('arbitrary request content cannot influence processor inputs', async () => {
  let receivedArguments = -1;
  const response = await handleReminderSchedulerRequest(
    request('Bearer ' + secret, 'POST', {
      appointmentId: 'attacker-controlled',
      recipient: 'attacker@example.com',
      dueAt: '2000-01-01T00:00:00Z',
    }),
    {
      secret,
      async processReminders(...args: never[]) {
        receivedArguments = args.length;
        return emptyResult;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(receivedArguments, 0);
});

test('processor failures are reported without corrupting durable work', async () => {
  const response = await handleReminderSchedulerRequest(
    request('Bearer ' + secret),
    {
      secret,
      async processReminders() {
        throw new Error('database unavailable');
      },
    },
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: 'Reminder processing failed',
  });
});

test('a later run can recover due work after a missed invocation', async () => {
  let due = true;
  const processReminders = async () => {
    if (!due) return emptyResult;
    due = false;
    return { claimed: 1, sent: 1, failed: 0, cancelled: 0 };
  };

  const recovered = await handleReminderSchedulerRequest(
    request('Bearer ' + secret),
    { secret, processReminders },
  );
  const followingRun = await handleReminderSchedulerRequest(
    request('Bearer ' + secret),
    { secret, processReminders },
  );

  assert.equal((await recovered.json()).sent, 1);
  assert.equal((await followingRun.json()).sent, 0);
});
