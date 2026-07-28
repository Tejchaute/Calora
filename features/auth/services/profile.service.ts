import { supabase } from '@/lib/supabase/client';

export async function updateProfile(
  userId: string,
  payload: { full_name: string; phone: string; avatar_url: string }
) {
  return supabase.from('profiles').update(payload).eq('id', userId);
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}
