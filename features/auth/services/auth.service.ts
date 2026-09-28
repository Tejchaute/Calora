import { supabase } from '@/lib/supabase/client';
import { AuthError } from '@/lib/auth/errors';
import { getCurrentSession } from '@/lib/auth/session';
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

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw AuthError.fromSupabaseError(error);
  return data;
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw AuthError.fromSupabaseError(userError);
  }

  if (!user?.email) {
    throw new Error('Unable to determine the current account email.');
  }

  // Re-authenticate before allowing the password change.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error('Current password is incorrect.');
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw AuthError.fromSupabaseError(error);
  }
}

/**
 * Used by the reset-password page (arrived via email magic link).
 * The Supabase session is already established by the link token,
 * so no current-password re-authentication is required.
 */
export async function setNewPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw AuthError.fromSupabaseError(error);
}
