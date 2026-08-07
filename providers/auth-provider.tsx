'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from '@/lib/auth/errors';
import { signOut as signOutService, getProfile } from '@/features/auth/services/auth.service';
import type { Profile } from '@/types/database';
import type { AuthContextValue } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [initialized, setInitialized] = useState(false);
  const latestProfileRequestRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const requestId = ++latestProfileRequestRef.current;

    try {
      const data = await getProfile(userId);

      if (requestId !== latestProfileRequestRef.current) {
        return;
      }

      setProfile(data);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err);
      }
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
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      const currentSession = data.session;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Don't block the UI while loading the profile.
      setLoading(false);
      setInitialized(true);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      switch (event) {
        case 'SIGNED_IN':
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            fetchProfile(newSession.user.id);
          }

          break;

        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          setProfile(null);
          break;

        case 'TOKEN_REFRESHED':
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setError(null);
          break;

        case 'USER_UPDATED':
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            fetchProfile(newSession.user.id);
          }

          break;
      }

      setLoading(false);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function useSession() {
  const auth = useAuth();

  return {
    session: auth.session,
    user: auth.user,
    loading: auth.loading,
    initialized: auth.initialized,
  };
}
