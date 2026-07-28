import { supabase } from '@/lib/supabase/client';
import type { Staff } from '@/types/database';

export async function getStaff(search?: string) {
  let query = supabase.from('staff').select('*').order('created_at', { ascending: false });
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`
    );
  }
  return query;
}

export async function getStaffServiceAssignments() {
  return supabase.from('staff_services').select('staff_id, service_id');
}

export async function getActiveServices() {
  return supabase.from('services').select('*').eq('status', 'active').order('name');
}

export async function createStaff(
  payload: Omit<Staff, 'id' | 'created_at' | 'updated_at' | 'profile_id'>,
  serviceIds: string[]
) {
  const { data, error } = await supabase
    .from('staff')
    .insert(payload)
    .select()
    .single();
  if (error || !data) return { data: null, error };

  if (serviceIds.length > 0) {
    await supabase
      .from('staff_services')
      .insert(serviceIds.map((service_id) => ({ staff_id: data.id, service_id })));
  }
  return { data, error: null };
}

export async function updateStaff(
  id: string,
  payload: Partial<Omit<Staff, 'id' | 'created_at' | 'updated_at'>>,
  serviceIds: string[]
) {
  const { error } = await supabase.from('staff').update(payload).eq('id', id);
  if (error) return { error };

  await supabase.from('staff_services').delete().eq('staff_id', id);
  if (serviceIds.length > 0) {
    await supabase
      .from('staff_services')
      .insert(serviceIds.map((service_id) => ({ staff_id: id, service_id })));
  }
  return { error: null };
}

export async function deleteStaff(id: string) {
  return supabase.from('staff').delete().eq('id', id);
}
