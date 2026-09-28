'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import {
  getGuestRedirectUrl,
  getLogoutRedirectUrl,
} from '@/lib/auth/redirects';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && initialized && !user) {
      const redirectUrl =
        `${getLogoutRedirectUrl()}?redirect=${encodeURIComponent(pathname)}`;

      router.replace(redirectUrl);
    }
  }, [user, loading, initialized, pathname, router]);

  if (loading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
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
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Redirecting"
        />
      </div>
    );
  }

  return <>{children}</>;
}
