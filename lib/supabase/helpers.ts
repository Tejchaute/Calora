import { supabase } from './client';
import type { AppointmentWithRelations } from '@/types/database';

const APPOINTMENT_RELATIONS = `
  *,
  customers(id, full_name, email, phone),
  services(id, name, duration, price, color),
  staff(id, full_name, avatar_url)
` as const;

export async function fetchAppointmentsWithRelations(query: ReturnType<typeof supabase.from>) {
  return query.select(APPOINTMENT_RELATIONS);
}

export const APPOINTMENT_SELECT = '*, customers(id, full_name, email, phone), services(id, name, duration, price, color), staff(id, full_name, avatar_url)';
