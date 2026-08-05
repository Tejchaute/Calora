import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import { format } from 'date-fns';
import type { Appointment } from '@/types/database';

export async function getDashboardData(today: string) {
  const [
    todayAppointments,
    upcomingAppointments,
    customers,
    services,
    staff,
    todayList,
    upcomingList,
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('appointment_date', today)
      .neq('status', 'cancelled'),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gt('appointment_date', today)
      .neq('status', 'cancelled'),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('staff').select('*', { count: 'exact', head: true }),
    supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('appointment_date', today)
      .order('start_time')
      .limit(10),
    supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .gt('appointment_date', today)
      .neq('status', 'cancelled')
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5),
  ]);

  const responses = [
    todayAppointments,
    upcomingAppointments,
    customers,
    services,
    staff,
    todayList,
    upcomingList,
  ];

  const failed = responses.find(r => r.error);

  if (failed) {
    throw failed.error;
  }
  return {
    todayAppointments,
    upcomingAppointments,
    customers,
    services,
    staff,
    todayList,
    upcomingList,
  };
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
  return supabase.from('appointments').update({ status }).eq('id', id);
}
