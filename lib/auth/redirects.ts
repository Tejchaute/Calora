export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',

  dashboard: '/dashboard',
  businessSetup: '/dashboard/setup',

  home: '/',
} as const;

export const PROTECTED_PREFIX = '/dashboard';

export const PUBLIC_ROUTES = [
  AUTH_ROUTES.home,
  AUTH_ROUTES.login,
  AUTH_ROUTES.register,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.resetPassword,
  AUTH_ROUTES.verifyEmail,
  '/book',
] as const;

export const GUEST_ONLY_ROUTES = [
  AUTH_ROUTES.login,
  AUTH_ROUTES.register,
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith(PROTECTED_PREFIX);
}

export function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.includes(pathname as (typeof GUEST_ONLY_ROUTES)[number]);
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number]);
}

export function getLoginRedirectUrl(searchParams?: { get: (key: string) => string | null }): string {
  const redirect = searchParams?.get('redirect');
  if (redirect && redirect.startsWith(PROTECTED_PREFIX)) {
    return redirect;
  }
  return AUTH_ROUTES.dashboard;
}

export function getLogoutRedirectUrl(): string {
  return AUTH_ROUTES.login;
}

export function getGuestRedirectUrl(): string {
  return AUTH_ROUTES.dashboard;
}
