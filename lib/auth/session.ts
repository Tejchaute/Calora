import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from './errors';


export function getSessionExpiry(session: Session | null): number | null {
  if (!session?.expires_at) return null;
  return session.expires_at * 1000;
}

export function isExpired(session: Session | null): boolean {
  const expiry = getSessionExpiry(session);
  if (!expiry) return true;
  return Date.now() >= expiry;
}


export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw AuthError.fromSupabaseError(error);
  return data.session;
}
