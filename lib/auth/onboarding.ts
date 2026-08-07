import { createClient } from '@/lib/supabase/server';

export async function getUserBusinessState() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authenticated: false,
      hasBusiness: false,
      onboardingCompleted: false,
    };
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('profile_id', user.id)
    .single();

  if (!membership) {
    return {
      authenticated: true,
      hasBusiness: false,
      onboardingCompleted: false,
    };
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('onboarding_completed')
    .eq('business_id', membership.business_id)
    .single();

  return {
    authenticated: true,
    hasBusiness: true,
    onboardingCompleted:
      settings?.onboarding_completed ?? false,
  };
}