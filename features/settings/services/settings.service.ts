import { supabase } from '@/lib/supabase/client';
import type { BusinessSettings } from '@/types/database';

type BusinessSettingsUpdate = Omit<
  Partial<BusinessSettings>,
  'id' | 'business_id' | 'created_at' | 'updated_at'
>;

export async function updateBusinessSettings(
  businessId: string,
  payload: BusinessSettingsUpdate,
  expectedUpdatedAt: string
) {
  const { data, error } = await supabase
    .from('business_settings')
    .update({
      business_name: payload.business_name ?? '',
      logo_url: payload.logo_url || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      currency: payload.currency,
      timezone: payload.timezone,
      booking_page_slug: payload.booking_page_slug || null,
    })
    .eq('business_id', businessId)
    .eq('updated_at', expectedUpdatedAt)
    .select('*')
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error,
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error('CALORA_BUSINESS_SETTINGS_STALE'),
    };
  }

  return { data: data as BusinessSettings, error: null };
}

export async function getBusinessTypeName(businessTypeId: string | null) {
  if (!businessTypeId) return null;

  const { data, error } = await supabase
    .from('business_types')
    .select('name')
    .eq('id', businessTypeId)
    .maybeSingle();

  if (error) throw error;
  return data?.name ?? null;
}
