const secret = process.env.REMINDER_SCHEDULER_SECRET;
const baseUrl = process.argv[2] ?? 'http://localhost:3000';

if (!secret) {
  console.error('REMINDER_SCHEDULER_SECRET is not configured.');
  process.exitCode = 1;
} else {
  const endpoint = new URL('/api/internal/appointment-reminders', baseUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + secret,
    },
    signal: AbortSignal.timeout(25_000),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Reminder scheduler invocation failed with status ' + response.status + '.');
    process.exitCode = 1;
  } else {
    console.info('Reminder scheduler completed:', result);
  }
}
