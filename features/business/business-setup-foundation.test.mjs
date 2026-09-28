import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('./components/business-setup-page.tsx', import.meta.url), 'utf8');
const route = await readFile(new URL('../../app/dashboard/setup/page.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('./services/business.service.ts', import.meta.url), 'utf8');
const guard = await readFile(new URL('../../components/auth/business-guard.tsx', import.meta.url), 'utf8');
const shell = await readFile(new URL('../../components/layout/dashboard-layout-client.tsx', import.meta.url), 'utf8');
const rpc = await readFile(
  new URL('../../supabase/migrations/20260913000000_authoritative_working_hours_initialization.sql', import.meta.url),
  'utf8'
);

test('setup remains a thin route over one focused product component', () => {
  assert.equal(route.includes('BusinessSetupPage'), true);
  assert.equal(route.includes("from('businesses')"), false);
});

test('the frontend uses only the authoritative business creation RPC', () => {
  assert.equal(page.includes('createBusiness({'), true);
  assert.equal(service.includes("'create_business_with_owner'"), true);
  for (const table of ['businesses', 'business_members', 'business_settings', 'subscriptions', 'working_hours']) {
    assert.equal(page.includes("from('" + table + "')"), false);
  }
});

test('server creation is authenticated, transactional, and duplicate safe', () => {
  assert.equal(rpc.includes('current_profile_id uuid := auth.uid()'), true);
  assert.equal(rpc.includes('pg_advisory_xact_lock'), true);
  assert.equal(rpc.includes('already associated with a business'), true);
  assert.equal(rpc.includes('SECURITY DEFINER'), true);
  assert.equal(rpc.includes("SET search_path = ''"), true);
});

test('the RPC owns membership, settings, trial, and weekly schedule initialization', () => {
  for (const target of [
    'INSERT INTO public.businesses',
    'INSERT INTO public.business_settings',
    'INSERT INTO public.business_members',
    'INSERT INTO public.subscriptions',
    'INSERT INTO public.working_hours',
  ]) {
    assert.equal(rpc.includes(target), true);
  }
  assert.equal(rpc.includes("trial_start + interval '14 days'"), true);
  assert.equal(rpc.includes('statement_timestamp()'), true);
  assert.equal(rpc.includes('generate_series(0, 6)'), true);
});

test('business slug generation remains in the existing service and RPC', () => {
  assert.equal(service.includes(".replace(/[^a-z0-9]+/g, '-')"), true);
  assert.equal(service.includes('p_slug: slug'), true);
  assert.equal(rpc.includes('normalized_slug'), true);
});

test('successful creation refreshes BusinessProvider before dashboard transition', () => {
  const createIndex = page.indexOf('await createBusiness');
  const refreshIndex = page.indexOf('await refresh()');
  const redirectIndex = page.indexOf("router.replace('/dashboard')");
  assert.ok(createIndex >= 0 && createIndex < refreshIndex);
  assert.ok(refreshIndex < redirectIndex);
});

test('duplicate client submission is prevented while the RPC remains final authority', () => {
  assert.equal(page.includes('submissionStartedRef.current'), true);
  assert.equal(page.includes('form.formState.isSubmitting'), true);
  assert.equal(rpc.includes('pg_advisory_xact_lock'), true);
});

test('existing-business users are redirected away from setup by BusinessGuard', () => {
  assert.equal(guard.includes('membership && isSetup'), true);
  assert.equal(guard.includes("router.replace('/dashboard')"), true);
  assert.equal(guard.includes('!membership && !isSetup'), true);
});

test('setup receives a focused shell without unfinished workspace navigation', () => {
  assert.equal(shell.includes("pathname === '/dashboard/setup'"), true);
  assert.equal(shell.includes('Skip to setup'), true);
});

test('setup supports loading, retry, validation, error, pending, and success states', () => {
  for (const expected of [
    'typesLoading',
    'loadBusinessTypes()',
    'FormMessage',
    'getSetupErrorMessage',
    'isSubmitting',
    'Your workspace is ready',
  ]) {
    assert.equal(page.includes(expected), true);
  }
});

test('setup does not introduce payment or downstream product configuration', () => {
  const lower = page.toLowerCase();
  for (const forbidden of ['stripe', 'checkout', 'customer import', 'notification settings', 'analytics setup']) {
    assert.equal(lower.includes(forbidden), false);
  }
});
