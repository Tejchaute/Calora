export function normalizePublicOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function getBookingPageUrl(slug: string, origin: string): string | null {
  const normalizedSlug = slug.trim();
  const normalizedOrigin = normalizePublicOrigin(origin);
  if (!normalizedSlug || !normalizedOrigin) return null;
  return `${normalizedOrigin}/book/${encodeURIComponent(normalizedSlug)}`;
}

export async function copyBookingPageUrl(
  bookingUrl: string,
  clipboard: Pick<Clipboard, 'writeText'>
): Promise<void> {
  await clipboard.writeText(bookingUrl);
}
