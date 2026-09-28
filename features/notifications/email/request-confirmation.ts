const APPOINTMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestAppointmentConfirmationEmail(
  appointmentId: string,
): void {
  if (
    typeof window === "undefined" ||
    !APPOINTMENT_ID_PATTERN.test(appointmentId)
  )
    return;

  void fetch("/api/notifications/appointment-created", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appointmentId }),
    keepalive: true,
  }).catch(() => {
    // Delivery work remains durable and can be retried independently.
  });
}
