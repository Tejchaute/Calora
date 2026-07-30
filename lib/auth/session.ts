import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from './errors';

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export function getSessionExpiry(session: Session | null): number | null {
  if (!session?.expires_at) return null;
  return session.expires_at * 1000;
}

export function needsRefresh(session: Session | null): boolean {
  const expiry = getSessionExpiry(session);
  if (!expiry) return false;
  return expiry - Date.now() < REFRESH_THRESHOLD_MS;
}

export function isExpired(session: Session | null): boolean {
  const expiry = getSessionExpiry(session);
  if (!expiry) return true;
  return Date.now() >= expiry;
}

export async function refreshSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw AuthError.sessionRefreshFailed(error);
  return data.session;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw AuthError.fromSupabaseError(error);
  return data.session;
}

export async function validateSession(session: Session | null): Promise<boolean> {
  if (!session) return false;
  if (isExpired(session)) {
    try {
      const refreshed = await refreshSession();
      return !!refreshed;
    } catch {
      return false;
    }
  }
  return true;
}
