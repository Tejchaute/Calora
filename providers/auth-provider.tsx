'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';

import { AuthError } from '@/lib/auth/errors';
import { isInvalidSessionError } from '@/lib/auth/session-verification';

import {
  signOut as signOutService,
  getProfile,
} from '@/features/auth/services/auth.service';

import type { Profile } from '@/types/database';
import type { AuthContextValue } from '@/types/auth';

const AuthContext =
  createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [isPasswordRecovery, setIsPasswordRecovery] =
    useState(false);

  /*
   * loading is ONLY for initial authentication
   * bootstrap.
   *
   * It must NOT become true during background
   * token refreshes or browser tab switches.
   */
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<AuthError | null>(null);

  const [initialized, setInitialized] =
    useState(false);

  /*
   * Protect against stale profile responses.
   */
  const latestProfileRequestRef =
    useRef(0);

  /*
   * Deduplicate simultaneous profile requests.
   */
  const profileRequestsRef =
    useRef(
      new Map<
        string,
        Promise<Profile | null>
      >()
    );

  /*
   * Keep current user ID available to the
   * Supabase auth listener without relying on
   * stale React state inside the effect.
   */
  const currentUserIdRef =
    useRef<string | null>(null);

  /*
   * Keep initialization state available to
   * the auth listener.
   */
  const initializedRef =
    useRef(false);

  const verificationRetryNeededRef = useRef(false);

  const beginUserSession = useCallback((userId: string) => {
    if (currentUserIdRef.current !== userId) {
      latestProfileRequestRef.current += 1;
      setProfile(null);
    }

    currentUserIdRef.current = userId;
  }, []);

  /*
   * Clear authentication state completely.
   */
  const clearAuthState = useCallback(() => {
    latestProfileRequestRef.current += 1;

    currentUserIdRef.current = null;

    profileRequestsRef.current.clear();

    setUser(null);
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
    setError(null);
    setLoading(false);
  }, []);

  const clearInvalidSession = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  /*
   * Fetch profile safely and deduplicate requests.
   */
  const fetchProfile = useCallback(
    async (userId: string) => {
      const existingRequest =
        profileRequestsRef.current.get(
          userId
        );

      if (existingRequest) {
        return existingRequest;
      }

      const requestId =
        ++latestProfileRequestRef.current;

      const request = getProfile(userId)
        .then(async (initialData) => {
          let data = initialData;

          if (!data) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            data = await getProfile(userId);
          }

          if (!data) {
            throw AuthError.profileNotFound();
          }

          /*
           * Ignore stale responses.
           */
          if (
            requestId !==
            latestProfileRequestRef.current
          ) {
            return data;
          }

          setProfile(data);
          setError(null);

          return data;
        })
        .catch((err) => {
          /*
           * Ignore stale errors.
           */
          if (
            requestId !==
            latestProfileRequestRef.current
          ) {
            return null;
          }

          setProfile(null);

          if (err instanceof AuthError) {
            setError(err);
          } else {
            setError(
              AuthError.unknown()
            );
          }

          return null;
        })
        .finally(() => {
          profileRequestsRef.current.delete(
            userId
          );
        });

      profileRequestsRef.current.set(
        userId,
        request
      );

      return request;
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /*
   * Sign out.
   */
  const handleSignOut = useCallback(
    async () => {
      try {
        await signOutService();

        clearAuthState();
      } catch (err) {
        if (err instanceof AuthError) {
          setError(err);
        } else {
          setError(
            AuthError.unknown()
          );
        }
      }
    },
    [clearAuthState]
  );

  /*
   * Explicit profile refresh.
   *
   * This does NOT block the whole application.
   */
  const refreshProfile = useCallback(
    async () => {
      const currentUser =
        currentUserIdRef.current;

      if (!currentUser) {
        return;
      }

      await fetchProfile(
        currentUser
      );
    },
    [fetchProfile]
  );

  useEffect(() => {
    let mounted = true;
    let verifying = false;

    async function initializeAuth() {
      if (verifying) return;
      verifying = true;
      try {
        const {
          data: { session },
          error: authError,
        } =
          await supabase.auth.getSession();

        if (authError) {
          throw AuthError.fromSupabaseError(
            authError
          );
        }

        if (!mounted) {
          return;
        }

        if (!session?.user) {
          verificationRetryNeededRef.current = false;
          clearAuthState();
          return;
        }

        const {
          data: { user: validatedUser },
          error: validationError,
        } = await supabase.auth.getUser(session.access_token);

        if (validationError || !validatedUser) {
          if (!validationError || isInvalidSessionError(validationError)) {
            verificationRetryNeededRef.current = false;
            await clearInvalidSession();
          } else {
            // Keep the SDK's persisted session for a later server retry, but
            // expose no unverified user to route guards in the meantime.
            verificationRetryNeededRef.current = true;
            clearAuthState();
            setError(AuthError.fromSupabaseError(validationError));
          }
          return;
        }

        if (!mounted) {
          return;
        }

        const nextUser = validatedUser;
        verificationRetryNeededRef.current = false;

        beginUserSession(nextUser.id);

        setSession(session);
        setUser(nextUser);

        /*
         * Initial profile load is part of
         * application bootstrap.
         */
        await fetchProfile(
          nextUser.id
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        clearAuthState();
        if (err instanceof AuthError) {
          setError(err);
        } else {
          setError(
            AuthError.unknown()
          );
        }

      } finally {
        verifying = false;
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          initializedRef.current =
            true;
        }
      }
    }

    void initializeAuth();
    const retryWhenOnline = () => {
      if (verificationRetryNeededRef.current) void initializeAuth();
    };
    window.addEventListener('online', retryWhenOnline);

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!mounted) {
            return;
          }

          switch (event) {
            case 'SIGNED_IN': {
              if (verifying || verificationRetryNeededRef.current) {
                if (!verifying) void initializeAuth();
                break;
              }
              setIsPasswordRecovery(false);

              const nextUser =
                newSession?.user ?? null;

              setError(null);

              if (!nextUser) {
                clearAuthState();
                break;
              }

              const userChanged = currentUserIdRef.current !== nextUser.id;

              if (userChanged) {
                setLoading(true);
              }

              beginUserSession(nextUser.id);

              setSession(newSession);
              setUser(nextUser);

              /*
               * During initial startup,
               * initializeAuth() is already
               * loading the profile.
               *
               * After initialization,
               * fetch it silently.
               */
              if (
                initializedRef.current
              ) {
                void fetchProfile(nextUser.id).finally(() => {
                  if (currentUserIdRef.current === nextUser.id) {
                    setLoading(false);
                  }
                });
              }

              /*
               * IMPORTANT:
               *
               * DO NOT call setLoading(true).
               *
               * SIGNED_IN can happen while the
               * application is already visible.
               */
              break;
            }

            case 'TOKEN_REFRESHED': {
              if (verifying || verificationRetryNeededRef.current) {
                if (!verifying) void initializeAuth();
                break;
              }
              /*
               * Token refresh is completely
               * background activity.
               */
              const refreshedUser = newSession?.user ?? null;

              if (!refreshedUser) {
                clearAuthState();
                break;
              }

              beginUserSession(refreshedUser.id);
              setSession(newSession);
              setUser(refreshedUser);

              break;
            }

            case 'USER_UPDATED': {
              const nextUser =
                newSession?.user ??
                null;

              setSession(
                newSession
              );

              setUser(
                nextUser
              );

              if (!nextUser) {
                clearAuthState();
                break;
              }

              beginUserSession(nextUser.id);

              /*
               * Refresh profile silently.
               */
              void fetchProfile(
                nextUser.id
              );

              break;
            }

            case 'SIGNED_OUT': {
              verificationRetryNeededRef.current = false;
              clearAuthState();

              /*
               * No need to touch loading here.
               * The app is already initialized.
               */
              break;
            }

            case 'INITIAL_SESSION': {
              /*
               * initializeAuth() owns initial
               * authentication bootstrap.
               */
              break;
            }

            case 'PASSWORD_RECOVERY': {
              const nextUser =
                newSession?.user ?? null;

              setSession(newSession);
              setUser(nextUser);
              setError(null);

              setIsPasswordRecovery(true);

              if (nextUser) {
                beginUserSession(nextUser.id);

                void fetchProfile(nextUser.id);
              }

              break;
            }

            default:
              break;
          }
        }
      );

    return () => {
      mounted = false;
      window.removeEventListener('online', retryWhenOnline);
      subscription.unsubscribe();
    };
  }, [
    clearAuthState,
    clearInvalidSession,
    beginUserSession,
    fetchProfile,
  ]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    error,
    initialized,
    signOut: handleSignOut,
    refreshProfile,
    clearError,
    isPasswordRecovery,
  }), [
    clearError,
    error,
    handleSignOut,
    initialized,
    isPasswordRecovery,
    loading,
    profile,
    refreshProfile,
    session,
    user,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}
