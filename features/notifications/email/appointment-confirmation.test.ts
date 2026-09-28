import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AppointmentEmailClaim,
  AppointmentEmailRepository,
  EmailProvider,
} from './contracts';
import { processAppointmentCreatedEmailCore } from './processor-core';
import { buildAppointmentConfirmationEmail } from './templates/appointment-confirmation';

const claim: Extract<AppointmentEmailClaim, { outcome: 'claimed' }> = {
  outcome: 'claimed',
  eventType: 'appointment.created',
  deliveryId: 'delivery-id',
  eventId: 'event-id',
  appointmentId: 'appointment-id',
  idempotencyKey: 'appointment-created-email:event-id',
  recipient: 'customer@example.com',
  customerName: 'Asha Rao',
  businessName: 'Calora Clinic',
  serviceName: 'Consultation',
  appointmentDate: '2026-09-14',
  startTime: '10:30:00',
  timezone: 'Asia/Kolkata',
  staffName: 'Dr. Mehta',
  price: 200,
  currency: 'INR',
};

function createRepository(nextClaim: AppointmentEmailClaim | null = claim) {
  const completions: unknown[][] = [];
  let available = true;
  const repository: AppointmentEmailRepository = {
    async claim() {
      if (!available) return null;
      available = false;
      return nextClaim;
    },
    async validateClaim() { return true; },
    async complete(...args) {
      completions.push(args);
    },
  };
  return { repository, completions };
}

test('confirmation email contains customer-facing appointment data in business timezone and currency', () => {
  const email = buildAppointmentConfirmationEmail(claim);
  assert.equal(email.to, 'customer@example.com');
  assert.match(email.subject, /Calora Clinic/);
  for (const value of [
    'Asha Rao',
    'Consultation',
    'Monday, September 14, 2026',
    '10:30 AM',
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
  assert.doesNotMatch(email.html, /appointment-id|delivery-id|event-id/);
});

test('currency formatting is not hardcoded to INR', () => {
  const email = buildAppointmentConfirmationEmail({
    ...claim,
    currency: 'USD',
    price: 45.5,
  });
  assert.match(email.text, /\$45\.50/);
  assert.doesNotMatch(email.text, /₹/);
});

test('successful processing sends once with deterministic idempotency and marks sent', async () => {
  const { repository, completions } = createRepository();
  const sends: unknown[][] = [];
  const provider: EmailProvider = {
    async send(...args) {
      sends.push(args);
      return { ok: true, providerMessageId: 'provider-message-id' };
    },
  };

  const first = await processAppointmentCreatedEmailCore('appointment-id', {
    repository,
    createProvider: () => provider,
  });
  const second = await processAppointmentCreatedEmailCore('appointment-id', {
    repository,
    createProvider: () => provider,
  });

  assert.deepEqual(first, { outcome: 'sent' });
  assert.deepEqual(second, { outcome: 'not_pending' });
  assert.equal(sends.length, 1);
  assert.equal(sends[0]?.[1], 'appointment-created-email:event-id');
  assert.deepEqual(completions[0], [
    'delivery-id',
    'appointment-created-email:event-id',
    'sent',
    'provider-message-id',
  ]);
});

test('missing recipient cancels without constructing a provider', async () => {
  const { repository, completions } = createRepository({
    outcome: 'cancelled',
    deliveryId: 'delivery-id',
    failureCategory: 'recipient_missing',
  });
  let providerCreated = false;
  const result = await processAppointmentCreatedEmailCore('appointment-id', {
    repository,
    createProvider: () => {
      providerCreated = true;
      throw new Error('must not run');
    },
  });
  assert.deepEqual(result, {
    outcome: 'cancelled',
    reason: 'recipient_missing',
  });
  assert.equal(providerCreated, false);
  assert.equal(completions.length, 0);
});

test('provider and configuration failures are recorded without throwing', async () => {
  const providerFailure = createRepository();
  const failedProvider: EmailProvider = {
    async send() {
      return { ok: false, category: 'provider' };
    },
  };
  assert.deepEqual(
    await processAppointmentCreatedEmailCore('appointment-id', {
      repository: providerFailure.repository,
      createProvider: () => failedProvider,
    }),
    { outcome: 'failed', category: 'provider' },
  );
  assert.equal(providerFailure.completions[0]?.[2], 'failed');
  assert.equal(providerFailure.completions[0]?.[4], 'provider');

  const configurationFailure = createRepository();
  assert.deepEqual(
    await processAppointmentCreatedEmailCore('appointment-id', {
      repository: configurationFailure.repository,
      createProvider: () => {
        throw new Error('missing config');
      },
    }),
    { outcome: 'failed', category: 'configuration' },
  );
  assert.equal(configurationFailure.completions[0]?.[4], 'configuration');
});
