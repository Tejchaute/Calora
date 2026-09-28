import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AppointmentEmailClaim,
  AppointmentEmailRepository,
  EmailProvider,
} from './contracts';
import { processAppointmentEmailCore } from './processor-core';
import { buildAppointmentReschedulingEmail } from './templates/appointment-rescheduling';

const reschedulingClaim: Extract<
  AppointmentEmailClaim,
  { outcome: 'claimed' }
> = {
  outcome: 'claimed',
  eventType: 'appointment.rescheduled',
  deliveryId: 'delivery-id',
  eventId: 'reschedule-event-id',
  appointmentId: 'appointment-id',
  idempotencyKey: 'appointment-rescheduled-email:reschedule-event-id',
  recipient: 'authoritative-customer@example.com',
  customerName: 'Asha Rao',
  businessName: 'Calora Clinic',
  serviceName: 'Consultation',
  appointmentDate: '2026-09-11',
  startTime: '15:30:00',
  previousAppointmentDate: '2026-09-10',
  previousStartTime: '14:30:00',
  timezone: 'Asia/Kolkata',
  staffName: 'Dr. Mehta',
  price: 200,
  currency: 'INR',
};

function repositoryFor(
  claim: AppointmentEmailClaim | null = reschedulingClaim,
) {
  let available = true;
  const completions: unknown[][] = [];
  const repository: AppointmentEmailRepository = {
    async claim() {
      if (!available) return null;
      available = false;
      return claim;
    },
    async validateClaim() { return true; },
    async complete(...args) {
      completions.push(args);
    },
  };
  return { repository, completions };
}

test('cancelled or superseded reschedule is revalidated immediately before provider send', async () => {
  const { repository, completions } = repositoryFor();
  repository.validateClaim = async () => false;
  let sent = false;
  const result = await processAppointmentEmailCore('appointment-id', 'appointment.rescheduled', {
    repository,
    createProvider: () => ({ async send() { sent = true; return { ok: true, providerMessageId: 'unexpected' }; } }),
  });
  assert.deepEqual(result, { outcome: 'not_pending' });
  assert.equal(sent, false);
  assert.equal(completions.length, 0);
});

test('eligibility verification failure fails closed without sending', async () => {
  const { repository } = repositoryFor();
  repository.validateClaim = async () => { throw new Error('database unavailable'); };
  let sent = false;
  await assert.rejects(processAppointmentEmailCore('appointment-id', 'appointment.rescheduled', {
    repository,
    createProvider: () => ({ async send() { sent = true; return { ok: true, providerMessageId: 'unexpected' }; } }),
  }), /database unavailable/);
  assert.equal(sent, false);
});

test('rescheduling email shows authoritative previous and new schedules', () => {
  const email = buildAppointmentReschedulingEmail(reschedulingClaim);
  for (const value of [
    'Your appointment has been rescheduled',
    'Previous appointment',
    'Thursday, September 10, 2026',
    '2:30 PM',
    'New appointment',
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
});

test('rescheduling email omits unavailable previous schedule and uses another currency', () => {
  const email = buildAppointmentReschedulingEmail({
    ...reschedulingClaim,
    previousAppointmentDate: null,
    previousStartTime: null,
    currency: 'USD',
    price: 45.5,
  });
  assert.ok(!email.text.includes('Previous appointment'));
  assert.ok(email.text.includes('$45.50'));
  assert.ok(!email.text.includes('₹'));
});

test('rescheduling delivery sends once with its deterministic key', async () => {
  const { repository, completions } = repositoryFor();
  const sends: unknown[][] = [];
  const provider: EmailProvider = {
    async send(...args) {
      sends.push(args);
      return { ok: true, providerMessageId: 'provider-reschedule-id' };
    },
  };
  const dependencies = { repository, createProvider: () => provider };

  assert.deepEqual(
    await processAppointmentEmailCore(
      'appointment-id',
      'appointment.rescheduled',
      dependencies,
    ),
    { outcome: 'sent' },
  );
  assert.deepEqual(
    await processAppointmentEmailCore(
      'appointment-id',
      'appointment.rescheduled',
      dependencies,
    ),
    { outcome: 'not_pending' },
  );
  assert.equal(sends.length, 1);
  assert.equal(
    sends[0]?.[1],
    'appointment-rescheduled-email:reschedule-event-id',
  );
  assert.equal(completions[0]?.[2], 'sent');
});

test('missing recipient and provider failure remain isolated from rescheduling', async () => {
  const missing = repositoryFor({
    outcome: 'cancelled',
    deliveryId: 'delivery-id',
    failureCategory: 'recipient_missing',
  });
  let sends = 0;
  const provider: EmailProvider = {
    async send() {
      sends += 1;
      return { ok: false, category: 'provider' };
    },
  };
  assert.deepEqual(
    await processAppointmentEmailCore(
      'appointment-id',
      'appointment.rescheduled',
      {
        repository: missing.repository,
        createProvider: () => provider,
      },
    ),
    { outcome: 'cancelled', reason: 'recipient_missing' },
  );
  assert.equal(sends, 0);

  const failed = repositoryFor();
  assert.deepEqual(
    await processAppointmentEmailCore(
      'appointment-id',
      'appointment.rescheduled',
      {
        repository: failed.repository,
        createProvider: () => provider,
      },
    ),
    { outcome: 'failed', category: 'provider' },
  );
  assert.equal(failed.completions[0]?.[2], 'failed');
});
