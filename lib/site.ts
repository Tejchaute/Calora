const FALLBACK_SITE_URL = 'https://calora.app';

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? FALLBACK_SITE_URL,
);

export function absoluteUrl(path = '/') {
  return new URL(path, siteUrl).toString();
}
