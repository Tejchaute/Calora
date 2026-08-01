import { supabase } from '@/lib/supabase/client';
import type { BusinessSettings, BrandingSettings } from '@/types/database';

export async function getBusinessSettings() {
  const [{ data: business }, { data: branding }] = await Promise.all([
    supabase.from('businesses').select('id, name, slug').maybeSingle(),
    supabase.from('branding_settings').select('*').maybeSingle(),
  ]);

  if (!business) return { data: null, error: null };

  const settings: BusinessSettings = {
    id: branding?.id || business.id,
    business_id: business.id,
    business_name: business.name,
    logo_url: branding?.logo_url || '',
    phone: '',
    email: '',
    address: '',
    currency: 'USD',
    timezone: 'UTC',
    booking_page_slug: business.slug || '',
  };

  return { data: settings, error: null };
}

export async function updateBusinessSettings(
  id: string,
  payload: Partial<Omit<BusinessSettings, 'id' | 'created_at' | 'updated_at'>>
) {
  const { data: business } = await supabase.from('businesses').select('id').eq('id', id).maybeSingle();
  if (!business) return { error: { message: 'Business not found' } as any };

  if (payload.business_name !== undefined) {
    await supabase.from('businesses').update({ name: payload.business_name }).eq('id', business.id);
  }

  if (payload.booking_page_slug !== undefined) {
    await supabase.from('businesses').update({ slug: payload.booking_page_slug }).eq('id', business.id);
  }

  const brandingUpdate: Partial<BrandingSettings> = {};
  if (payload.logo_url !== undefined) brandingUpdate.logo_url = payload.logo_url;

  if (Object.keys(brandingUpdate).length > 0) {
    const { data: existingBranding } = await supabase
      .from('branding_settings')
      .select('id')
      .eq('business_id', business.id)
      .maybeSingle();

    if (existingBranding) {
      await supabase.from('branding_settings').update(brandingUpdate).eq('id', existingBranding.id);
    } else {
      await supabase.from('branding_settings').insert({ ...brandingUpdate, business_id: business.id });
    }
  }

  return { error: null };
}
