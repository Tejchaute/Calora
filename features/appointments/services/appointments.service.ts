import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import type { Appointment } from '@/types/database';

const PAGE_SIZE = 10;

export async function getAppointments({
  page,
  status,
  search,
}: {
  page: number;
  status?: string;
  search?: string;
}) {
  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT, { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(
      `customers.full_name.ilike.%${search}%,services.name.ilike.%${search}%`
    );
  }

  return query
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
  return supabase.from('appointments').update({ status }).eq('id', id);
}

export async function deleteAppointment(id: string) {
  return supabase.from('appointments').delete().eq('id', id);
}

export async function getFormOptions() {
  return Promise.all([
    supabase.from('services').select('*').eq('status', 'active').order('name'),
    supabase.from('staff').select('*').eq('status', 'active').order('full_name'),
    supabase.from('customers').select('*').order('full_name'),
  ]);
}

export async function createCustomerInline(payload: {
  full_name: string;
  phone: string;
  email: string;
}) {
  return supabase.from('customers').insert(payload).select().single();
}

export async function createAppointment(payload: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('appointments').insert(payload);
}

export async function updateAppointment(
  id: string,
  payload: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>
) {
  return supabase.from('appointments').update(payload).eq('id', id);
}

export { PAGE_SIZE as APPOINTMENTS_PAGE_SIZE };
