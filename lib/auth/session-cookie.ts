'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

const COOKIE_NAME = 'sb-access-token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function useSessionCookieSync() {
  useEffect(() => {
    const syncCookie = (token: string | null) => {
      if (token) {
        document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
      } else {
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      syncCookie(data.session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncCookie(session?.access_token ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
