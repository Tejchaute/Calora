import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import { format } from 'date-fns';

export async function getCalendarAppointments(startDate: Date, endDate: Date) {
  return supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
    .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
    .order('appointment_date')
    .order('start_time');
}
