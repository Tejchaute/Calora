import { processDueAppointmentReminders } from '@/features/notifications/email/reminder-processor';
import { handleReminderSchedulerRequest } from '@/features/notifications/scheduler/reminder-scheduler-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const logger = {
  info(event: string, details: Record<string, number>) {
    console.info({ event, ...details });
  },
  error(event: string) {
    console.error({ event });
  },
};

export async function POST(request: Request): Promise<Response> {
  return handleReminderSchedulerRequest(request, {
    secret: process.env.REMINDER_SCHEDULER_SECRET,
    processReminders: processDueAppointmentReminders,
    logger,
  });
}
