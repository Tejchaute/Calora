import { supabase } from '@/lib/supabase/client';

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function createProfile(userId: string, fullName: string, email: string) {
  return supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    email,
    role: 'admin',
  });
}

export async function resetPassword(email: string, redirectTo: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
