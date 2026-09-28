const schedulerPath = '/api/internal/appointment-reminders';

function getSchedulerConfiguration() {
  const siteUrl = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  const secret = process.env.REMINDER_SCHEDULER_SECRET;

  if (!siteUrl || !secret) {
    throw new Error('Reminder scheduler configuration is unavailable');
  }

  return {
    endpoint: new URL(schedulerPath, siteUrl).toString(),
    secret,
  };
}

export default async function processAppointmentReminders(): Promise<Response> {
  const { endpoint, secret } = getSchedulerConfiguration();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + secret,
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error('Reminder processor invocation failed');
  }

  console.info({
    event: 'appointment_reminder_schedule_invoked',
    status: response.status,
  });
  return new Response(null, { status: 204 });
}
