import { supabase } from '@/lib/supabase/client';
import type { Holiday, WorkingHours } from '@/types/database';
import { breakPairError } from '@/features/staff/utils/working-hours-break';

export async function getWorkingHoursData(businessId: string) {
  return Promise.all([
    supabase
      .from('working_hours')
      .select('*')
      .eq('business_id', businessId)
      .is('staff_id', null)
      .order('day_of_week'),

    supabase
      .from('business_holidays')
      .select('*')
      .eq('business_id', businessId)
      .order('date'),
  ]);
}

export async function upsertWorkingHours(
  businessId: string,
  dayOfWeek: number,
  schedule: Pick<
    WorkingHours,
    'is_open' | 'open_time' | 'close_time' | 'break_start' | 'break_end'
  >
) {
  const {
    is_open: isOpen,
    open_time: openTime,
    close_time: closeTime,
    break_start: breakStart,
    break_end: breakEnd,
  } = schedule;

  const breakError = breakPairError(breakStart, breakEnd);
  if (breakError) {
    return {
      data: null,
      error: new Error(breakError),
    };
  }

  if (
    isOpen &&
    (!openTime ||
      !closeTime ||
      closeTime <= openTime)
  ) {
    return {
      data: null,
      error: new Error(
        'Closing time must be later than opening time.'
      ),
    };
  }

  return supabase
    .from('working_hours')
    .upsert(
      {
        business_id: businessId,
        staff_id: null,
        day_of_week: dayOfWeek,
        is_open: isOpen,
        open_time: openTime,
        close_time: closeTime,
        break_start: breakStart,
        break_end: breakEnd,
      },
      { onConflict: 'business_id,staff_id,day_of_week' }
    )
    .select('*')
    .single();
}

export async function createHoliday(
  businessId: string,
  payload: Pick<Holiday, 'date' | 'name'>
) {
  return supabase
    .from('business_holidays')
    .insert({
      business_id: businessId,
      date: payload.date,
      name: payload.name,
    })
    .select()
    .single();
}

export async function deleteHoliday(
  businessId: string,
  id: string
) {
  return supabase
    .from('business_holidays')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);
}
