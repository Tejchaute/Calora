import { supabase } from '@/lib/supabase/client';
import { AuthError } from '@/lib/auth/errors';

export async function updateProfile(
  userId: string,
  payload: { full_name: string; phone: string; avatar_url: string }
) {
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw AuthError.fromSupabaseError(error);
}
