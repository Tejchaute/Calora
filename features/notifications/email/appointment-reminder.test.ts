import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AppointmentReminderEmailClaim,
  AppointmentReminderEmailRepository,
  EmailProvider,
} from './contracts';
import { processDueAppointmentRemindersCore } from './reminder-processor-core';
import { buildAppointmentReminderEmail } from './templates/appointment-reminder';

const reminderClaim: Extract<
  AppointmentReminderEmailClaim,
  { outcome: 'claimed' }
> = {
  outcome: 'claimed',
  deliveryId: 'delivery-id',
  appointmentId: 'appointment-id',
  idempotencyKey: 'appointment-reminder-email:appointment-id:epoch:1440',
  scheduledFor: '2026-09-11T10:00:00Z',
  recipient: 'authoritative-customer@example.com',
  customerName: 'Asha Rao',
  businessName: 'Calora Clinic',
  serviceName: 'Consultation',
  appointmentDate: '2026-09-11',
  startTime: '15:30:00',
  timezone: 'Asia/Kolkata',
  staffName: 'Dr. Mehta',
  price: 200,
  currency: 'INR',
};

function repositoryFor(claims: AppointmentReminderEmailClaim[]) {
  const queue = [...claims];
  const completions: unknown[][] = [];
  const repository: AppointmentReminderEmailRepository = {
    async reconcileMissing() {
      return 0;
    },
    async claimDue() {
      return queue.shift() ?? null;
    },
    async validateClaim() { return true; },
    async complete(...args) {
      completions.push(args);
    },
  };
  return { repository, completions };
}

test('reminder invalidated after claim is not sent', async () => {
  const { repository, completions } = repositoryFor([reminderClaim]);
  repository.validateClaim = async () => false;
  let sent = false;
  const result = await processDueAppointmentRemindersCore(1, {
    repository,
    createProvider: () => ({ async send() { sent = true; return { ok: true, providerMessageId: 'unexpected' }; } }),
  });
  assert.equal(sent, false);
  assert.equal(result.cancelled, 1);
  assert.equal(completions.length, 0);
});

test('reminder template contains only authoritative customer-facing details', () => {
  const email = buildAppointmentReminderEmail(reminderClaim);
  for (const value of [
    'Appointment reminder',
    'Asha Rao',
    'Calora Clinic',
    'Consultation',
    'Friday, September 11, 2026',
    '3:30 PM',
    'Asia/Kolkata',
    'Dr. Mehta',
    '₹200.00',
  ]) {
    assert.ok(email.html.includes(value));
    assert.ok(email.text.includes(value));
  }
  assert.ok(!email.html.includes('appointment-id'));
  assert.ok(!email.html.includes('delivery-id'));
  assert.ok(!email.html.includes('Manage appointment'));
});

test('reminder template formats another authoritative currency', () => {
  const email = buildAppointmentReminderEmail({
    ...reminderClaim,
    currency: 'USD',
    price: 45.5,
  });
  assert.ok(email.text.includes('$45.50'));
  assert.ok(!email.text.includes('₹'));
});

test('due reminder is sent once with deterministic provider idempotency', async () => {
  const { repository, completions } = repositoryFor([reminderClaim]);
  const sends: unknown[][] = [];
  const provider: EmailProvider = {
    async send(...args) {
      sends.push(args);
      return { ok: true, providerMessageId: 'provider-reminder-id' };
    },
  };
  const result = await processDueAppointmentRemindersCore(25, {
    repository,
    createProvider: () => provider,
  });
  assert.deepEqual(result, {
    claimed: 1,
    sent: 1,
    failed: 0,
    cancelled: 0,
  });
  assert.equal(sends.length, 1);
  assert.equal(sends[0]?.[1], reminderClaim.idempotencyKey);
  assert.equal(completions[0]?.[2], 'sent');
});

test('ineligible and missing-recipient reminders never invoke provider', async () => {
  const { repository } = repositoryFor([
    {
      outcome: 'cancelled',
      deliveryId: 'stale',
      failureCategory: 'reminder_ineligible',
    },
    {
      outcome: 'cancelled',
      deliveryId: 'missing',
      failureCategory: 'recipient_missing',
    },
  ]);
  let sends = 0;
  const result = await processDueAppointmentRemindersCore(25, {
    repository,
    createProvider: () => ({
      async send() {
        sends += 1;
        return { ok: true, providerMessageId: 'unexpected' };
      },
    }),
  });
  assert.deepEqual(result, {
    claimed: 0,
    sent: 0,
    failed: 0,
    cancelled: 2,
  });
  assert.equal(sends, 0);
});

test('provider and configuration failures are isolated and recorded', async () => {
  const providerFailure = repositoryFor([reminderClaim]);
  const failed = await processDueAppointmentRemindersCore(1, {
    repository: providerFailure.repository,
    createProvider: () => ({
      async send() {
        return { ok: false, category: 'provider' };
      },
    }),
  });
  assert.equal(failed.failed, 1);
  assert.equal(providerFailure.completions[0]?.[2], 'failed');
  assert.equal(providerFailure.completions[0]?.[4], 'provider');

  const configurationFailure = repositoryFor([reminderClaim]);
  const misconfigured = await processDueAppointmentRemindersCore(1, {
    repository: configurationFailure.repository,
    createProvider: () => {
      throw new Error('configuration unavailable');
    },
  });
  assert.equal(misconfigured.failed, 1);
  assert.equal(configurationFailure.completions[0]?.[4], 'configuration');
});
