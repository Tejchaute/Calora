import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import type { Customer } from '@/types/database';

const PAGE_SIZE = 10;

export async function getCustomers({ page, search }: { page: number; search?: string }) {
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  return query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
}

export async function createCustomer(
  payload: Pick<Customer, 'full_name' | 'email' | 'phone' | 'notes'>
) {
  return supabase.from('customers').insert(payload);
}

export async function updateCustomer(
  id: string,
  payload: Pick<Customer, 'full_name' | 'email' | 'phone' | 'notes'>
) {
  return supabase.from('customers').update(payload).eq('id', id);
}

export async function deleteCustomer(id: string) {
  return supabase.from('customers').delete().eq('id', id);
}

export async function getCustomerAppointments(customerId: string) {
  return supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('customer_id', customerId)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });
}

export { PAGE_SIZE as CUSTOMERS_PAGE_SIZE };
