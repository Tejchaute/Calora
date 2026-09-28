import { NextResponse } from 'next/server';
import { processAppointmentEmail } from '@/features/notifications/email/processor';
import { createRequestClient } from '@/lib/supabase/request-client';

export const runtime = 'nodejs';

const APPOINTMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let appointmentId: string | undefined;
  try {
    const body = (await request.json()) as { appointmentId?: unknown };
    appointmentId =
      typeof body.appointmentId === 'string' ? body.appointmentId : undefined;
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  if (!appointmentId || !APPOINTMENT_ID_PATTERN.test(appointmentId)) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return NextResponse.json({ accepted: false }, { status: 401 });
  const supabase = createRequestClient(request);
  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData.user) {
    return NextResponse.json({ accepted: false }, { status: 401 });
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!appointment) {
    return NextResponse.json({ accepted: false }, { status: 404 });
  }

  try {
    await processAppointmentEmail(appointmentId, 'appointment.cancelled');
  } catch {
    // Cancellation success is independent of provider processing.
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}
