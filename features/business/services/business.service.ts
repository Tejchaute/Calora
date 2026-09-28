import { supabase } from '@/lib/supabase/client';
import type {
    Business,
    BusinessMember,
    BusinessSettings,
    BusinessType,
} from '@/types/database';

export async function getBusinessTypes(): Promise<BusinessType[]> {
    const { data, error } = await supabase
        .from('business_types')
        .select('*')
        .order('sort_order');

    if (error) throw error;

    return data;
}

export async function createBusiness({
    name,
    businessTypeId,
}: {
    name: string;
    businessTypeId: string;
}): Promise<Business> {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const { data: business, error } = await supabase.rpc(
        'create_business_with_owner',
        {
            p_name: name,
            p_slug: slug,
            p_business_type_id: businessTypeId,
        }
    );

    if (error) throw error;

    return business;
}

export async function getBusinessMembership(
    profileId: string
): Promise<BusinessMember | null> {
    const { data, error } = await supabase
        .from('business_members')
        .select('*')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw error;

    return data;
}

export async function getBusinessById(
    businessId: string
): Promise<Business> {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

    if (error) throw error;

    return data;
}

export async function getBusinessSettingsById(
    businessId: string
): Promise<BusinessSettings | null> {
    const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

    if (error) throw error;

    return data;
}
