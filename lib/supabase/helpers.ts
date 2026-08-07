import { supabase } from './client';

export async function fetchAppointmentsWithRelations(
  query: ReturnType<typeof supabase.from>
) {
  return query.select(APPOINTMENT_SELECT);
}

export const APPOINTMENT_SELECT = '*, customers(id, full_name, email, phone), services(id, name, duration, price, color), staff(id, full_name, avatar_url)';
