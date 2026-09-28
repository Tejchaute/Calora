import type {
  AppointmentReminderEmailRepository,
  EmailProvider,
} from './contracts';
import { buildAppointmentReminderEmail } from './templates/appointment-reminder';

export type ReminderBatchResult = {
  claimed: number;
  sent: number;
  failed: number;
  cancelled: number;
};

export async function processDueAppointmentRemindersCore(
  limit: number,
  dependencies: {
    repository: AppointmentReminderEmailRepository;
    createProvider: () => EmailProvider;
  },
): Promise<ReminderBatchResult> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const result: ReminderBatchResult = {
    claimed: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
  };

  await dependencies.repository.reconcileMissing();

  for (let index = 0; index < safeLimit; index += 1) {
    const claim = await dependencies.repository.claimDue();
    if (!claim) break;

    if (claim.outcome === 'cancelled') {
      result.cancelled += 1;
      continue;
    }

    result.claimed += 1;
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
      result.failed += 1;
      continue;
    }

    if (!await dependencies.repository.validateClaim(claim.deliveryId)) {
      result.cancelled += 1;
      continue;
    }
    const providerResult = await provider.send(
      buildAppointmentReminderEmail(claim),
      claim.idempotencyKey,
    );
    if (!providerResult.ok) {
      await dependencies.repository.complete(
        claim.deliveryId,
        claim.idempotencyKey,
        'failed',
        undefined,
        providerResult.category,
      );
      result.failed += 1;
      continue;
    }

    await dependencies.repository.complete(
      claim.deliveryId,
      claim.idempotencyKey,
      'sent',
      providerResult.providerMessageId,
    );
    result.sent += 1;
  }

  return result;
}
