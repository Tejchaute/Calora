export type AppointmentConfirmationEmailData = {
  recipient: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  timezone: string;
  staffName: string | null;
  price: number;
  currency: string;
};

export type AppointmentEmailEventType =
  'appointment.created' | 'appointment.cancelled' | 'appointment.rescheduled';

export type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailProviderResult =
  | { ok: true; providerMessageId: string }
  | {
      ok: false;
      category:
        'configuration' | 'provider' | 'network' | 'timeout' | 'unexpected';
    };

export interface EmailProvider {
  send(
    message: TransactionalEmail,
    idempotencyKey: string,
  ): Promise<EmailProviderResult>;
}

export type ClaimedAppointmentEmail = AppointmentConfirmationEmailData & {
  outcome: 'claimed';
  eventType: AppointmentEmailEventType;
  deliveryId: string;
  eventId: string;
  appointmentId: string;
  idempotencyKey: string;
  previousAppointmentDate?: string | null;
  previousStartTime?: string | null;
};

export type AppointmentEmailClaim =
  | ClaimedAppointmentEmail
  | {
      outcome: 'cancelled';
      deliveryId: string;
      failureCategory: 'recipient_missing';
    };

export interface AppointmentEmailRepository {
  validateClaim(deliveryId: string): Promise<boolean>;
  claim(
    appointmentId: string,
    eventType: AppointmentEmailEventType,
  ): Promise<AppointmentEmailClaim | null>;
  complete(
    deliveryId: string,
    idempotencyKey: string,
    state: 'sent' | 'failed',
    providerMessageId?: string,
    failureCategory?: string,
  ): Promise<void>;
}

export type ClaimedAppointmentReminderEmail =
  AppointmentConfirmationEmailData & {
    outcome: 'claimed';
    deliveryId: string;
    appointmentId: string;
    idempotencyKey: string;
    scheduledFor: string;
  };

export type AppointmentReminderEmailClaim =
  | ClaimedAppointmentReminderEmail
  | {
      outcome: 'cancelled';
      deliveryId: string;
      failureCategory: 'recipient_missing' | 'reminder_ineligible';
    };

export interface AppointmentReminderEmailRepository {
  validateClaim(deliveryId: string): Promise<boolean>;
  reconcileMissing(): Promise<number>;
  claimDue(): Promise<AppointmentReminderEmailClaim | null>;
  complete(
    deliveryId: string,
    idempotencyKey: string,
    state: 'sent' | 'failed',
    providerMessageId?: string,
    failureCategory?: string,
  ): Promise<void>;
}
