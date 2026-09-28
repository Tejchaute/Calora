import { supabase } from '@/lib/supabase/client';
import type { Service } from '@/types/database';

type ServicePayload = Partial<
  Omit<Service, 'id' | 'created_at' | 'updated_at'>
>;

export async function getServices(
  businessId: string,
  search?: string
) {
  let query = supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (search?.trim()) {
    const term = search.trim();

    query = query.or(
      `name.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  return query;
}

export async function createService(
  businessId: string,
  payload: Partial<
    Omit<Service, 'id' | 'business_id' | 'created_at' | 'updated_at'>
  >
) {
  return supabase
    .from('services')
    .insert({
      ...payload,
      business_id: businessId,
    });
}

export async function updateService(
  businessId: string,
  id: string,
  payload: Partial<
    Omit<Service, 'id' | 'business_id' | 'created_at' | 'updated_at'>
  >
) {
  return supabase
    .from('services')
    .update(payload)
    .eq('id', id)
    .eq('business_id', businessId);
}

export async function deleteService(
  businessId: string,
  id: string
) {
  const { count, error: appointmentError } = await supabase
    .from('appointments')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('business_id', businessId)
    .eq('service_id', id);

  if (appointmentError) {
    return {
      data: null,
      error: appointmentError,
    };
  }

  if ((count ?? 0) > 0) {
    return {
      data: null,
      error: new Error(
        'This service is already used by appointments. Deactivate it instead of deleting it.'
      ),
    };
  }

  return supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);
}