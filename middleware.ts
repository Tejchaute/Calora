import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isProtectedRoute, isGuestOnlyRoute, AUTH_ROUTES } from '@/lib/auth/redirects';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname)) {
    const authCookie = request.cookies.get('sb-access-token');
    if (!authCookie) {
      const loginUrl = new URL(AUTH_ROUTES.login, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isGuestOnlyRoute(pathname)) {
    const authCookie = request.cookies.get('sb-access-token');
    if (authCookie) {
      return NextResponse.redirect(new URL(AUTH_ROUTES.dashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};
