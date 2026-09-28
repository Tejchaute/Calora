type SessionReader = () => Promise<{
  data: { session: { access_token: string } | null };
  error: unknown;
}>;

export async function requestAuthenticatedNotification(
  path: string,
  appointmentId: string,
  getSession: SessionReader,
  send: typeof fetch = globalThis.fetch,
): Promise<void> {
  try {
    const { data, error } = await getSession();
    if (error || !data.session?.access_token) return;
    await send(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ appointmentId }),
      keepalive: true,
    });
  } catch {
    // Never reject an already-committed appointment or log its session token.
  }
}
