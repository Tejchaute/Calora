import 'server-only';

import { getEmailNotificationConfig } from './config';
import type {
  AppointmentReminderEmailRepository,
  EmailProvider,
} from './contracts';
import { ResendEmailProvider } from './providers/resend-email-provider';
import {
  processDueAppointmentRemindersCore,
  type ReminderBatchResult,
} from './reminder-processor-core';
import { createAppointmentReminderEmailRepository } from './reminder-repository';
import { processRetryableAppointmentEmails } from './recovery-processor';

export async function processDueAppointmentReminders(
  limit = 25,
  dependencies: {
    repository?: AppointmentReminderEmailRepository;
    provider?: EmailProvider;
  } = {},
): Promise<ReminderBatchResult> {
  const repository =
    dependencies.repository ?? createAppointmentReminderEmailRepository();
  const reminderWork = processDueAppointmentRemindersCore(limit, {
    repository,
    createProvider: () =>
      dependencies.provider ??
      new ResendEmailProvider(getEmailNotificationConfig()),
  });
  if (!dependencies.repository) {
    const [result] = await Promise.all([
      reminderWork,
      processRetryableAppointmentEmails().catch(() => {
        console.warn('Lifecycle email recovery deferred.');
      }),
    ]);
    return result;
  }
  return reminderWork;
}
