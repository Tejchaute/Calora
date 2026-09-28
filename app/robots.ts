import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
