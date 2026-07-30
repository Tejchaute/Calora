'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getGuestRedirectUrl, getLogoutRedirectUrl } from '@/lib/auth/redirects';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && initialized && !user) {
      const redirectUrl = `${getLogoutRedirectUrl()}?redirect=${encodeURIComponent('/dashboard')}`;
      router.replace(redirectUrl);
    }
  }, [user, loading, initialized, router]);

  if (loading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Redirecting" />
      </div>
    );
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: AuthGuardProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && initialized && user) {
      router.replace(getGuestRedirectUrl());
    }
  }, [user, loading, initialized, router]);

  if (loading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Redirecting" />
      </div>
    );
  }

  return <>{children}</>;
}
