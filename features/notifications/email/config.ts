import "server-only";

export type EmailNotificationConfig = {
  apiKey: string;
  fromEmail: string;
  timeoutMs: number;
};

export class NotificationConfigurationError extends Error {
  constructor() {
    super("Email notification configuration is unavailable.");
    this.name = "NotificationConfigurationError";
  }
}

export function getEmailNotificationConfig(): EmailNotificationConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    throw new NotificationConfigurationError();
  }

  return { apiKey, fromEmail, timeoutMs: 8_000 };
}
