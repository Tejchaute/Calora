import { supabase } from '@/lib/supabase/client';
import type { Appointment, BusinessSettings } from '@/types/database';
import { format } from 'date-fns';

export async function getBookingInitialData() {
  const [services, staff, business, branding, workingHours] = await Promise.all([
    supabase.from('services').select('*').eq('status', 'active').order('name'),
    supabase.from('staff').select('*').eq('status', 'active').order('full_name'),
    supabase.from('businesses').select('id, name, slug').limit(1).maybeSingle(),
    supabase.from('branding_settings').select('*').limit(1).maybeSingle(),
    supabase.from('working_hours').select('*'),
  ]);

  const settings: BusinessSettings | null = business.data
    ? {
        id: branding.data?.id || business.data.id,
        business_id: business.data.id,
        business_name: business.data.name,
        logo_url: branding.data?.logo_url || '',
        phone: '',
        email: '',
        address: '',
        currency: 'USD',
        timezone: 'UTC',
        booking_page_slug: business.data.slug || '',
      }
    : null;

  return {
    services,
    staff,
    businessSettings: { data: settings, error: null as any },
    workingHours,
    holidays: { data: [] as any[], error: null as any },
  };
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
    if (existing) return { id: existing.id as string, error: null as any };
  }

  const { data, error } = await supabase.from('customers').insert(payload).select().single();
  return { id: data?.id as string | undefined, error };
}

export async function createBooking(
  payload: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>
) {
  return supabase.from('appointments').insert(payload);
}
