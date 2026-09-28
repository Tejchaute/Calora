import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AppointmentEmailClaim,
  AppointmentEmailRepository,
  EmailProvider,
} from './contracts';
import { processAppointmentEmailCore } from './processor-core';
import { buildAppointmentCancellationEmail } from './templates/appointment-cancellation';

const cancellationClaim: Extract<
  AppointmentEmailClaim,
  { outcome: 'claimed' }
> = {
  outcome: 'claimed',
  eventType: 'appointment.cancelled',
  deliveryId: 'delivery-id',
  eventId: 'cancellation-event-id',
  appointmentId: 'appointment-id',
  idempotencyKey: 'appointment-cancelled-email:cancellation-event-id',
  recipient: 'authoritative-customer@example.com',
  customerName: 'Asha Rao',
  businessName: 'Calora Clinic',
  serviceName: 'Consultation',
  appointmentDate: '2026-09-10',
  startTime: '14:30:00',
  timezone: 'Asia/Kolkata',
  staffName: 'Dr. Mehta',
  price: 200,
  currency: 'INR',
};

function repositoryFor(
  claim: AppointmentEmailClaim | null = cancellationClaim,
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

test('cancellation email contains the original scheduled details, timezone and currency', () => {
  const email = buildAppointmentCancellationEmail(cancellationClaim);
  assert.equal(email.to, 'authoritative-customer@example.com');
  for (const value of [
    'Your appointment has been cancelled',
    'Asha Rao',
    'Calora Clinic',
    'Consultation',
    'Thursday, September 10, 2026',
    '2:30 PM',
    'Asia/Kolkata',
    'Dr. Mehta',
    '₹200.00',
  ]) {
    assert.match(
      email.html,
      new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
    assert.match(
      email.text,
      new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }
  assert.doesNotMatch(
    email.html,
    /appointment-id|delivery-id|cancellation-event-id/,
  );
  assert.doesNotMatch(email.text, /reason:/i);
});

test('cancellation email uses another authoritative currency without hardcoding INR', () => {
  const email = buildAppointmentCancellationEmail({
    ...cancellationClaim,
    currency: 'USD',
    price: 45.5,
  });
  assert.match(email.text, /\$45\.50/);
  assert.doesNotMatch(email.text, /₹/);
});

test('cancellation delivery uses the existing processor/provider once with its deterministic key', async () => {
  const { repository, completions } = repositoryFor();
  const sends: unknown[][] = [];
  const provider: EmailProvider = {
    async send(...args) {
      sends.push(args);
      return { ok: true, providerMessageId: 'provider-cancellation-id' };
    },
  };

  const first = await processAppointmentEmailCore(
    'appointment-id',
    'appointment.cancelled',
    { repository, createProvider: () => provider },
  );
  const duplicate = await processAppointmentEmailCore(
    'appointment-id',
    'appointment.cancelled',
    { repository, createProvider: () => provider },
  );

  assert.deepEqual(first, { outcome: 'sent' });
  assert.deepEqual(duplicate, { outcome: 'not_pending' });
  assert.equal(sends.length, 1);
  assert.equal(
    sends[0]?.[1],
    'appointment-cancelled-email:cancellation-event-id',
  );
  assert.equal(completions[0]?.[2], 'sent');
});

test('missing recipient and provider failure remain isolated from cancellation', async () => {
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
      'appointment.cancelled',
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
      'appointment.cancelled',
      {
        repository: failed.repository,
        createProvider: () => provider,
      },
    ),
    { outcome: 'failed', category: 'provider' },
  );
  assert.equal(failed.completions[0]?.[2], 'failed');
});
