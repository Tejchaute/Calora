import { supabase } from '@/lib/supabase/client';
import { APPOINTMENT_SELECT } from '@/lib/supabase/helpers';
import type {
  AppointmentLifecycleEvent,
  AppointmentWithRelations,
  Customer,
  DashboardBusinessClock,
} from '@/types/database';

export const CUSTOMERS_PAGE_SIZE = 10;
export const CUSTOMER_HISTORY_PAGE_SIZE = 50;

type CustomerPayload = Partial<
  Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at'>
>;

export interface CustomerWithIntelligence extends Customer {
  appointment_count: number;
  completed_count: number;
  cancelled_count: number;
  next_appointment: AppointmentWithRelations | null;
  last_appointment: AppointmentWithRelations | null;
}

export interface CustomerDetailData {
  customerId: string;
  clock: DashboardBusinessClock;
  appointments: AppointmentWithRelations[];
  events: AppointmentLifecycleEvent[];
  summary: { total: number; completed: number; cancelled: number; operational: number };
  historyCount: number;
}

type CustomerAppointmentCounts = {
  customer_id: string;
  appointment_count: number;
  completed_count: number;
  cancelled_count: number;
  operational_count: number;
  next_appointment_id: string | null;
  last_appointment_id: string | null;
};

export async function getCustomers(
  businessId: string,
  {
    page,
    search,
  }: {
    page: number;
    search?: string;
  },
) {
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (search?.trim()) {
    const term = search.trim().replace(/[,%()]/g, '');

    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const customerResult = await query.range(
    page * CUSTOMERS_PAGE_SIZE,
    (page + 1) * CUSTOMERS_PAGE_SIZE - 1,
  );

  if (customerResult.error || !customerResult.data?.length) {
    return customerResult as typeof customerResult & {
      data: CustomerWithIntelligence[] | null;
    };
  }

  const customerIds = customerResult.data.map((customer) => customer.id);
  const countsResult = await supabase.rpc('get_customer_appointment_counts', {
      p_business_id: businessId,
      p_customer_ids: customerIds,
    });

  const intelligenceError = countsResult.error;
  if (intelligenceError) {
    return { ...customerResult, data: null, error: intelligenceError };
  }

  const counts = (countsResult.data ?? []) as CustomerAppointmentCounts[];
  const appointmentIds = [...new Set(counts.flatMap((row) =>
    [row.next_appointment_id, row.last_appointment_id].filter((id): id is string => Boolean(id)),
  ))];
  const appointmentResult = appointmentIds.length
    ? await supabase.from('appointments').select(APPOINTMENT_SELECT)
        .eq('business_id', businessId).in('id', appointmentIds)
    : { data: [], error: null };
  if (appointmentResult.error) return { ...customerResult, data: null, error: appointmentResult.error };
  const byId = new Map(((appointmentResult.data ?? []) as AppointmentWithRelations[])
    .map((appointment) => [appointment.id, appointment]));
  const byCustomer = new Map(counts.map((row) => [row.customer_id, row]));
  const enriched: CustomerWithIntelligence[] = customerResult.data.map((customer) => {
    const row = byCustomer.get(customer.id);
    return {
      ...customer,
      appointment_count: row?.appointment_count ?? 0,
      completed_count: row?.completed_count ?? 0,
      cancelled_count: row?.cancelled_count ?? 0,
      next_appointment: row?.next_appointment_id ? byId.get(row.next_appointment_id) ?? null : null,
      last_appointment: row?.last_appointment_id ? byId.get(row.last_appointment_id) ?? null : null,
    };
  });

  return { ...customerResult, data: enriched, error: null };
}

export async function createCustomer(
  businessId: string,
  payload: CustomerPayload,
) {
  return supabase.from('customers').insert({
    ...payload,
    business_id: businessId,
  });
}

export async function updateCustomer(
  businessId: string,
  id: string,
  payload: CustomerPayload,
) {
  return supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .eq('business_id', businessId);
}

export async function getCustomerAppointments(
  businessId: string,
  customerId: string,
  offset = 0,
) {
  return supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + CUSTOMER_HISTORY_PAGE_SIZE - 1);
}

export async function getCustomerDetail(
  businessId: string,
  customerId: string,
): Promise<{ data: CustomerDetailData | null; error: unknown | null }> {
  const [clockResult, appointmentsResult, countsResult, eventsResult] = await Promise.all([
    supabase.rpc('get_dashboard_business_clock', { p_business_id: businessId }),
    getCustomerAppointments(businessId, customerId),
    supabase.rpc('get_customer_appointment_counts', { p_business_id: businessId, p_customer_ids: [customerId] }),
    supabase
      .from('appointment_lifecycle_events')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('occurred_at', { ascending: false })
      .limit(50),
  ]);

  const error =
    clockResult.error || appointmentsResult.error || countsResult.error || eventsResult.error;
  if (error) return { data: null, error };

  const clock = (
    Array.isArray(clockResult.data) ? clockResult.data[0] : clockResult.data
  ) as DashboardBusinessClock | undefined;
  if (!clock)
    return { data: null, error: new Error('Business time is unavailable.') };

  const count = ((countsResult.data ?? []) as CustomerAppointmentCounts[])[0];
  const initialAppointments = (appointmentsResult.data ?? []) as AppointmentWithRelations[];
  const nextId = count?.next_appointment_id;
  const nextResult = nextId && !initialAppointments.some((item) => item.id === nextId)
    ? await supabase.from('appointments').select(APPOINTMENT_SELECT)
        .eq('business_id', businessId).eq('customer_id', customerId).eq('id', nextId).maybeSingle()
    : { data: null, error: null };
  if (nextResult.error) return { data: null, error: nextResult.error };

  return {
    data: {
      customerId,
      clock,
      appointments: nextResult.data
        ? [...initialAppointments, nextResult.data as AppointmentWithRelations]
        : initialAppointments,
      events: (eventsResult.data ?? []) as AppointmentLifecycleEvent[],
      summary: {
        total: count?.appointment_count ?? 0,
        completed: count?.completed_count ?? 0,
        cancelled: count?.cancelled_count ?? 0,
        operational: count?.operational_count ?? 0,
      },
      historyCount: initialAppointments.length,
    },
    error: null,
  };
}
