import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [layout, robots, sitemap, notFound, footer, authLayout, dashboardLayout] = await Promise.all([
  read('../app/layout.tsx'),
  read('../app/robots.ts'),
  read('../app/sitemap.ts'),
  read('../app/not-found.tsx'),
  read('../components/landing/LandingFooter.tsx'),
  read('../app/(auth)/layout.tsx'),
  read('../app/dashboard/layout.tsx'),
]);

test('public metadata includes canonical, Open Graph, Twitter, and icon assets', () => {
  assert.match(layout, /alternates:/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /opengraph-image/);
  assert.match(layout, /icon\.svg/);
});

test('robots excludes private and authentication surfaces', () => {
  assert.match(robots, /\/dashboard\//);
  assert.match(robots, /\/api\//);
  assert.match(robots, /\/login/);
  assert.match(robots, /\/reset-password/);
  assert.match(robots, /sitemap\.xml/);
});

test('sitemap contains only intentional public static routes', () => {
  assert.match(sitemap, /absoluteUrl\('\/'\)/);
  assert.match(sitemap, /\/privacy/);
  assert.match(sitemap, /\/terms/);
  assert.doesNotMatch(sitemap, /dashboard|login|register/);
});

test('private route groups explicitly opt out of indexing', () => {
  assert.match(authLayout, /index: false/);
  assert.match(dashboardLayout, /index: false/);
});

test('custom not-found and legal navigation remain useful', () => {
  assert.match(notFound, /Page not found/);
  assert.match(notFound, /Back to homepage/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);
});
