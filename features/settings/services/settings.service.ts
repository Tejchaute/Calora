import { supabase } from '@/lib/supabase/client';
import type { BusinessSettings } from '@/types/database';

export async function getBusinessSettings() {
  return supabase.from('business_settings').select('*').maybeSingle();
}

export async function updateBusinessSettings(
  id: string,
  payload: Partial<Omit<BusinessSettings, 'id' | 'created_at' | 'updated_at'>>
) {
  return supabase.from('business_settings').update(payload).eq('id', id);
}
