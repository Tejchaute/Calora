import { supabase } from '@/lib/supabase/client';
import type { Service } from '@/types/database';

export async function getServices(search?: string) {
  let query = supabase.from('services').select('*').order('created_at', { ascending: false });
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  return query;
}

export async function createService(
  payload: Omit<Service, 'id' | 'created_at' | 'updated_at'>
) {
  return supabase.from('services').insert(payload);
}

export async function updateService(
  id: string,
  payload: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>
) {
  return supabase.from('services').update(payload).eq('id', id);
}

export async function deleteService(id: string) {
  return supabase.from('services').delete().eq('id', id);
}
