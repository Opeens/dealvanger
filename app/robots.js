import { SITE_URL } from '@/lib/config';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/login/verify'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
