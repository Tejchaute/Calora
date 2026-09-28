import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const [
  shell,
  service,
  login,
  register,
  verify,
  forgot,
  reset,
  redirects,
  provider,
  guestGuard,
  loginRoute,
  registerRoute,
  verifyRoute,
  forgotRoute,
  resetRoute,
] =
  await Promise.all([
    read('../../components/layout/auth-shell.tsx'),
    read('./services/auth.service.ts'),
    read('./components/login-page.tsx'),
    read('./components/register-page.tsx'),
    read('./components/verify-email-page.tsx'),
    read('./components/forgot-password-page.tsx'),
    read('./components/reset-password-page.tsx'),
    read('../../lib/auth/redirects.ts'),
    read('../../providers/auth-provider.tsx'),
    read('../../components/auth/auth-guard.tsx'),
    read('../../app/(auth)/login/page.tsx'),
    read('../../app/(auth)/register/page.tsx'),
    read('../../app/(auth)/verify-email/page.tsx'),
    read('../../app/(auth)/forgot-password/page.tsx'),
    read('../../app/(auth)/reset-password/page.tsx'),
  ]);

test('shared auth shell contains branding without fabricated workspace data', () => {
  assert.match(shell, /Calora/);
  assert.match(shell, /Simple scheduling for modern businesses/);
  assert.doesNotMatch(shell, /PREVIEW_METRICS|PREVIEW_APPOINTMENTS|DashboardPreview/);
  assert.doesNotMatch(shell, /Anita Sharma|Marcus Lee|Priya Nair|On track/);
});

test('login keeps the authoritative sign-in service and redirect helper', () => {
  assert.match(login, /await signIn\(values\.email, values\.password\)/);
  assert.match(login, /router\.replace\(getLoginRedirectUrl\(searchParams\)\)/);
  assert.doesNotMatch(login, /remember|Keep me signed in|Checkbox/);
});

test('existing GuestGuard redirects authenticated users through the centralized destination', () => {
  assert.match(guestGuard, /export function GuestGuard/);
  assert.match(guestGuard, /router\.replace\(getGuestRedirectUrl\(\)\)/);
  assert.match(guestGuard, /if \(!loading && initialized && user\)/);
});

test('GuestGuard applies only to login and registration routes', () => {
  assert.match(loginRoute, /<GuestGuard>[\s\S]*<LoginPage \/>[\s\S]*<\/GuestGuard>/);
  assert.match(registerRoute, /<GuestGuard>[\s\S]*<RegisterPage \/>[\s\S]*<\/GuestGuard>/);
  assert.doesNotMatch(verifyRoute, /GuestGuard/);
  assert.doesNotMatch(forgotRoute, /GuestGuard/);
  assert.doesNotMatch(resetRoute, /GuestGuard/);
});

test('registration preserves session and verification redirect branches', () => {
  assert.match(register, /if \(data\.session\)/);
  assert.match(register, /router\.replace\(AUTH_ROUTES\.dashboard\)/);
  assert.match(register, /AUTH_ROUTES\.verifyEmail/);
});

test('verification preserves successful resend before success feedback', () => {
  assert.match(verify, /await resendVerificationEmail/);
  assert.match(verify, /setResent\(true\)/);
  assert.match(verify, /AUTH_ROUTES\.dashboard/);
});

test('forgot password preserves the reset service and anti-spam cooldown', () => {
  assert.match(forgot, /await resetPassword/);
  assert.match(forgot, /const RESEND_COOLDOWN = 30/);
  assert.match(forgot, /AUTH_ROUTES\.resetPassword/);
});

test('reset password preserves the recovery-session password update path', () => {
  assert.match(reset, /await setNewPassword\(values\.password\)/);
  assert.match(reset, /AUTH_ROUTES\.login/);
});

test('auth service remains a thin Supabase Auth boundary', () => {
  assert.match(service, /supabase\.auth\.signInWithPassword/);
  assert.match(service, /supabase\.auth\.signUp/);
  assert.match(service, /supabase\.auth\.resetPasswordForEmail/);
  assert.match(service, /supabase\.auth\.resend/);
  assert.match(service, /supabase\.auth\.updateUser/);
});

test('protected redirect validation remains centralized', () => {
  assert.match(redirects, /redirect\.startsWith\(PROTECTED_PREFIX\)/);
  assert.match(redirects, /return AUTH_ROUTES\.dashboard/);
});

test('AuthProvider continues to own session and recovery events', () => {
  assert.match(provider, /supabase\.auth\.getSession\(\)/);
  assert.match(provider, /supabase\.auth\.onAuthStateChange/);
  assert.match(provider, /case 'PASSWORD_RECOVERY'/);
  assert.match(provider, /case 'SIGNED_OUT'/);
});

test('all auth forms retain accessible autocomplete semantics', () => {
  assert.match(login, /autoComplete="email"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(register, /autoComplete="name"/);
  assert.match(register, /autoComplete="new-password"/);
  assert.match(forgot, /autoComplete="email"/);
  assert.match(reset, /autoComplete="new-password"/);
});
