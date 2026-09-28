import type {
  AppointmentEmailEventType,
  AppointmentEmailRepository,
  EmailProvider,
} from './contracts';
import { buildAppointmentConfirmationEmail } from './templates/appointment-confirmation';
import { buildAppointmentCancellationEmail } from './templates/appointment-cancellation';
import { buildAppointmentReschedulingEmail } from './templates/appointment-rescheduling';

export type AppointmentEmailProcessingResult =
  | { outcome: 'sent' }
  | { outcome: 'cancelled'; reason: 'recipient_missing' }
  | { outcome: 'not_pending' }
  | { outcome: 'failed'; category: string };

export async function processAppointmentEmailCore(
  appointmentId: string,
  eventType: AppointmentEmailEventType,
  dependencies: {
    repository: AppointmentEmailRepository;
    createProvider: () => EmailProvider;
  },
): Promise<AppointmentEmailProcessingResult> {
  const claim = await dependencies.repository.claim(appointmentId, eventType);
  if (!claim) return { outcome: 'not_pending' };
  if (claim.outcome === 'cancelled') {
    return { outcome: 'cancelled', reason: 'recipient_missing' };
  }

  let provider: EmailProvider;
  try {
    provider = dependencies.createProvider();
  } catch {
    await dependencies.repository.complete(
      claim.deliveryId,
      claim.idempotencyKey,
      'failed',
      undefined,
      'configuration',
    );
    return { outcome: 'failed', category: 'configuration' };
  }

  const message =
    claim.eventType === 'appointment.cancelled'
      ? buildAppointmentCancellationEmail(claim)
      : claim.eventType === 'appointment.rescheduled'
        ? buildAppointmentReschedulingEmail(claim)
        : buildAppointmentConfirmationEmail(claim);
  if (!await dependencies.repository.validateClaim(claim.deliveryId)) {
    return { outcome: 'not_pending' };
  }
  const result = await provider.send(message, claim.idempotencyKey);
  if (!result.ok) {
    await dependencies.repository.complete(
      claim.deliveryId,
      claim.idempotencyKey,
      'failed',
      undefined,
      result.category,
    );
    return { outcome: 'failed', category: result.category };
  }

  await dependencies.repository.complete(
    claim.deliveryId,
    claim.idempotencyKey,
    'sent',
    result.providerMessageId,
  );
  return { outcome: 'sent' };
}

export function processAppointmentCreatedEmailCore(
  appointmentId: string,
  dependencies: {
    repository: AppointmentEmailRepository;
    createProvider: () => EmailProvider;
  },
) {
  return processAppointmentEmailCore(
    appointmentId,
    'appointment.created',
    dependencies,
  );
}
