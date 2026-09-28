import { z } from 'zod';

export const notificationSettingsSchema = z.object({
  send_confirmations: z.boolean(),
  send_cancellations: z.boolean(),
  send_rescheduling: z.boolean(),
  send_reminders: z.boolean(),
  reminder_hours_before: z.coerce
    .number()
    .int('Reminder timing must be a whole number of hours.')
    .min(1, 'Reminder timing must be at least 1 hour.')
    .max(720, 'Reminder timing cannot exceed 30 days.'),
});

export type NotificationSettingsFormData = z.infer<
  typeof notificationSettingsSchema
>;
