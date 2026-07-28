import { supabase } from '@/lib/supabase/client';
import type { WorkingHours } from '@/types/database';

export async function getWorkingHoursData() {
  return Promise.all([
    supabase.from('working_hours').select('*'),
    supabase.from('staff').select('*').eq('status', 'active').order('full_name'),
    supabase.from('holidays').select('*').order('date', { ascending: false }),
  ]);
}

export async function upsertWorkingHours(
  existingId: string | undefined,
  staffId: string | null,
  dayOfWeek: number,
  updates: Partial<WorkingHours>
) {
  if (existingId) {
    return supabase.from('working_hours').update(updates).eq('id', existingId);
  }
  return supabase.from('working_hours').insert({
    staff_id: staffId,
    day_of_week: dayOfWeek,
    is_open: updates.is_open ?? true,
    open_time: updates.open_time ?? '09:00',
    close_time: updates.close_time ?? '17:00',
    break_start: updates.break_start ?? null,
    break_end: updates.break_end ?? null,
  });
}

export async function addHoliday(date: string, name: string) {
  return supabase.from('holidays').insert({ date, name: name || 'Holiday' });
}

export async function deleteHoliday(id: string) {
  return supabase.from('holidays').delete().eq('id', id);
}
