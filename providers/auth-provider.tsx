'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from '@/lib/auth/errors';
import { needsRefresh, refreshSession } from '@/lib/auth/session';
import { signOut as signOutService, getProfile } from '@/features/auth/services/auth.service';
import type { Profile } from '@/types/database';
import type { AuthContextValue } from '@/types/auth';

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSession: async () => {},
  clearError: () => {},
});

const REFRESH_INTERVAL_MS = 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [initialized, setInitialized] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const data = await getProfile(userId);
      setProfile(data);
    } catch (err) {
      if (err instanceof AuthError) setError(err);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOutService();
      setProfile(null);
      setUser(null);
      setSession(null);
    } catch (err) {
      if (err instanceof AuthError) setError(err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const handleRefreshSession = useCallback(async () => {
    try {
      const refreshed = await refreshSession();
      if (refreshed) {
        setSession(refreshed);
        setUser(refreshed.user);
      }
    } catch {
      setError(AuthError.sessionRefreshFailed());
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id).finally(() => {
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
        });
      } else {
        setLoading(false);
        setInitialized(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          setError(null);
        }

        setLoading(false);
        setInitialized(true);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!session) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    const checkAndRefresh = () => {
      if (needsRefresh(session)) {
        handleRefreshSession();
      }
    };

    refreshTimerRef.current = setInterval(checkAndRefresh, REFRESH_INTERVAL_MS);
    checkAndRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [session, handleRefreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        error,
        initialized,
        signOut: handleSignOut,
        refreshProfile,
        refreshSession: handleRefreshSession,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useSession() {
  const { session, user, loading, initialized } = useContext(AuthContext);
  return { session, user, loading, initialized };
}
