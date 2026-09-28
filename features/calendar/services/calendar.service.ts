import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import { format } from 'date-fns';

export async function getCalendarAppointments(
  businessId: string,
  startDate: Date,
  endDate: Date,
) {
  return supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('business_id', businessId)
    .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
    .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
    .order('appointment_date')
    .order('start_time');
}

export async function getCalendarWorkingHours(businessId: string) {
  return supabase
    .from('working_hours')
    .select('*')
    .eq('business_id', businessId)
    .is('staff_id', null)
    .order('day_of_week');
}

export async function getCalendarHolidays(
  businessId: string,
  startDate: Date,
  endDate: Date,
) {
  return supabase
    .from('business_holidays')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date');
}

export async function getCalendarBusinessClock(businessId: string) {
  return supabase.rpc('get_dashboard_business_clock', {
    p_business_id: businessId,
  });
}
