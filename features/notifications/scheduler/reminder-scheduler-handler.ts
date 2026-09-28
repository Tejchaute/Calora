import { timingSafeEqual } from 'node:crypto';
import type { ReminderBatchResult } from '../email/reminder-processor-core';

type ReminderProcessor = () => Promise<ReminderBatchResult>;

type SchedulerLogger = {
  info: (event: string, details: ReminderBatchResult) => void;
  error: (event: string) => void;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
};

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function authorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  return secureEquals(authorization.slice('Bearer '.length), secret);
}

export async function handleReminderSchedulerRequest(
  request: Request,
  dependencies: {
    secret: string | undefined;
    processReminders: ReminderProcessor;
    logger?: SchedulerLogger;
  },
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...jsonHeaders, allow: 'POST' },
    });
  }

  if (!dependencies.secret) {
    dependencies.logger?.error('appointment_reminder_scheduler_misconfigured');
    return new Response(JSON.stringify({ error: 'Scheduler unavailable' }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  if (!authorized(request, dependencies.secret)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    // The request body is intentionally ignored. The trusted processor discovers
    // due work from the database and retains its own bounded batch size.
    const result = await dependencies.processReminders();
    dependencies.logger?.info(
      'appointment_reminder_scheduler_completed',
      result,
    );
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch {
    dependencies.logger?.error('appointment_reminder_scheduler_failed');
    return new Response(JSON.stringify({ error: 'Reminder processing failed' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
