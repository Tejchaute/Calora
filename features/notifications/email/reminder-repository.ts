import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';
import type {
  AppointmentReminderEmailClaim,
  AppointmentReminderEmailRepository,
} from './contracts';

type ClaimRecord = Record<string, Json | undefined>;

function asRecord(value: Json): ClaimRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ClaimRecord)
    : null;
}

function stringValue(record: ClaimRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value) {
    throw new Error('Reminder claim payload is invalid.');
  }
  return value;
}

function parseReminderClaim(
  value: Json | null,
): AppointmentReminderEmailClaim | null {
  if (value === null) return null;
  const record = asRecord(value);
  if (!record) throw new Error('Reminder claim payload is invalid.');

  if (record.outcome === 'cancelled') {
    const failureCategory = stringValue(record, 'failure_category');
    if (
      failureCategory !== 'recipient_missing' &&
      failureCategory !== 'reminder_ineligible'
    ) {
      throw new Error('Reminder claim cancellation is invalid.');
    }
    return {
      outcome: 'cancelled',
      deliveryId: stringValue(record, 'delivery_id'),
      failureCategory,
    };
  }

  if (record.outcome !== 'claimed') {
    throw new Error('Reminder claim payload is invalid.');
  }
  const price = record.price;
  if (typeof price !== 'number' && typeof price !== 'string') {
    throw new Error('Reminder price is invalid.');
  }

  return {
    outcome: 'claimed',
    deliveryId: stringValue(record, 'delivery_id'),
    appointmentId: stringValue(record, 'appointment_id'),
    idempotencyKey: stringValue(record, 'idempotency_key'),
    scheduledFor: stringValue(record, 'scheduled_for'),
    recipient: stringValue(record, 'recipient'),
    customerName: stringValue(record, 'customer_name'),
    businessName: stringValue(record, 'business_name'),
    serviceName: stringValue(record, 'service_name'),
    appointmentDate: stringValue(record, 'appointment_date'),
    startTime: stringValue(record, 'start_time'),
    timezone: stringValue(record, 'timezone'),
    staffName: typeof record.staff_name === 'string' ? record.staff_name : null,
    price: Number(price),
    currency: stringValue(record, 'currency'),
  };
}

export function createAppointmentReminderEmailRepository(): AppointmentReminderEmailRepository {
  const client = createAdminClient();
  const claimTokens = new Map<string, string>();
  return {
    async validateClaim(deliveryId) {
      const token = claimTokens.get(deliveryId);
      if (!token) return false;
      const { data, error } = await client.rpc('validate_appointment_email_claim', {
        target_delivery_id: deliveryId, target_claim_token: token,
      });
      if (error) throw new Error('Unable to validate notification delivery.');
      return data === true;
    },
    async reconcileMissing() {
      const { data, error } = await client.rpc(
        'reconcile_missing_appointment_email_reminders',
      );
      if (error) throw new Error('Unable to reconcile reminder deliveries.');
      return typeof data === 'number' ? data : 0;
    },
    async claimDue() {
      const { data, error } = await client.rpc(
        'claim_due_appointment_email_reminder',
      );
      if (error) throw new Error('Unable to claim due reminder delivery.');
      const claim = parseReminderClaim(data);
      if (claim?.outcome === 'claimed') {
        const record = asRecord(data!);
        if (!record) throw new Error('Notification claim payload is invalid.');
        claimTokens.set(claim.deliveryId, stringValue(record, 'claim_token'));
      }
      return claim;
    },
    async complete(
      deliveryId,
      idempotencyKey,
      state,
      providerMessageId,
      failureCategory,
    ) {
      const token = claimTokens.get(deliveryId);
      if (!token) throw new Error('Notification claim is unavailable.');
      const { error } = await client.rpc('complete_appointment_email_claim', {
        target_claim_token: token,
        target_delivery_id: deliveryId,
        target_idempotency_key: idempotencyKey,
        target_state: state,
        target_provider_message_id: providerMessageId ?? null,
        target_failure_category: failureCategory ?? null,
      });
      if (error) throw new Error('Unable to update reminder delivery.');
    },
  };
}
