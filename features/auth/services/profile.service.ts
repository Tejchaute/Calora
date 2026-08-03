import { supabase } from '@/lib/supabase/client';
import { AuthError } from '@/lib/auth/errors';
import type { Profile } from '@/types/database';

export async function updateProfile(
  userId: string,
  payload: { full_name: string; phone: string; avatar_url: string }
) {
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw AuthError.fromSupabaseError(error);
}

export async function getProfileWithMeta(userId: string): Promise<{
  profile: Profile | null;
  lastSignIn: string | null;
}> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw AuthError.fromSupabaseError(error);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    profile,
    lastSignIn: user?.last_sign_in_at ?? null,
  };
}
