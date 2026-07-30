'use client';

import { useSessionCookieSync } from '@/lib/auth/session-cookie';

export function SessionCookieSync() {
  useSessionCookieSync();
  return null;
}
