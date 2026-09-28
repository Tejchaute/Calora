import 'server-only';

import { getEmailNotificationConfig } from './config';
import type {
  AppointmentEmailEventType,
  AppointmentEmailRepository,
  EmailProvider,
} from './contracts';
import { ResendEmailProvider } from './providers/resend-email-provider';
import { createAppointmentEmailRepository } from './repository';
import {
  processAppointmentEmailCore,
  type AppointmentEmailProcessingResult,
} from './processor-core';

type ProcessorDependencies = {
  repository?: AppointmentEmailRepository;
  provider?: EmailProvider;
};

export async function processAppointmentCreatedEmail(
  appointmentId: string,
  dependencies: ProcessorDependencies = {},
): Promise<AppointmentEmailProcessingResult> {
  const repository =
    dependencies.repository ?? createAppointmentEmailRepository();
  return processAppointmentEmailCore(appointmentId, 'appointment.created', {
    repository,
    createProvider: () =>
      dependencies.provider ??
      new ResendEmailProvider(getEmailNotificationConfig()),
  });
}

export async function processAppointmentEmail(
  appointmentId: string,
  eventType: AppointmentEmailEventType,
  dependencies: ProcessorDependencies = {},
): Promise<AppointmentEmailProcessingResult> {
  const repository =
    dependencies.repository ?? createAppointmentEmailRepository();
  return processAppointmentEmailCore(appointmentId, eventType, {
    repository,
    createProvider: () =>
      dependencies.provider ??
      new ResendEmailProvider(getEmailNotificationConfig()),
  });
}
