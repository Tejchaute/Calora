import { supabase } from '@/lib/supabase/client';
import type { Appointment } from '@/types/database';
import { format, isSameDay } from 'date-fns';

export async function getBookingInitialData() {
  return Promise.all([
    supabase.from('services').select('*').eq('status', 'active').order('name'),
    supabase.from('staff').select('*').eq('status', 'active').order('full_name'),
    supabase.from('business_settings').select('*').maybeSingle(),
    supabase.from('working_hours').select('*'),
    supabase.from('holidays').select('*'),
  ]);
}

export async function getBookedSlotsForDate(date: Date, staffId?: string | null) {
  let query = supabase
    .from('appointments')
    .select('start_time, end_time, staff_id')
    .eq('appointment_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  return query;
}

export async function findOrCreateCustomer(payload: {
  full_name: string;
  phone: string;
  email: string;
}) {
  if (payload.phone || payload.email) {
    const orParts: string[] = [];
    if (payload.phone) orParts.push(`phone.eq.${payload.phone}`);
    if (payload.email) orParts.push(`email.eq.${payload.email}`);
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .or(orParts.join(','))
      .maybeSingle();
    if (existing) return { id: existing.id as string, error: null };
  }

  const { data, error } = await supabase.from('customers').insert(payload).select().single();
  return { id: data?.id as string | undefined, error };
}

export async function createBooking(
  payload: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
) {
  return supabase.from('appointments').insert(payload);
}
