import { NextResponse } from "next/server";
import { processAppointmentCreatedEmail } from "@/features/notifications/email/processor";

export const runtime = "nodejs";

const APPOINTMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let appointmentId: string | undefined;

  try {
    const body = (await request.json()) as { appointmentId?: unknown };
    appointmentId =
      typeof body.appointmentId === "string" ? body.appointmentId : undefined;
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  if (!appointmentId || !APPOINTMENT_ID_PATTERN.test(appointmentId)) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  try {
    await processAppointmentCreatedEmail(appointmentId);
  } catch {
    // Appointment success is intentionally independent of provider processing.
    // The route never returns provider, recipient, or configuration details.
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}
