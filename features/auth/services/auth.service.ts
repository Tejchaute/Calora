import { supabase } from '@/lib/supabase/client';
import { AuthError } from '@/lib/auth/errors';
import { getCurrentSession, refreshSession } from '@/lib/auth/session';
import type { Profile } from '@/types/database';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw AuthError.fromSupabaseError(error);
  return data;
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw AuthError.fromSupabaseError(error);
  return data;
}

export async function createProfile(userId: string, fullName: string, email: string) {
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    email,
    role: 'admin',
  });
  if (error) throw AuthError.fromSupabaseError(error);
}

export async function resetPassword(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw AuthError.fromSupabaseError(error);
}

export async function resendVerificationEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw AuthError.fromSupabaseError(error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw AuthError.fromSupabaseError(error);
}

export async function getSession() {
  return getCurrentSession();
}

export async function refreshCurrentSession() {
  return refreshSession();
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw AuthError.fromSupabaseError(error);
  return data;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw AuthError.fromSupabaseError(error);
}
