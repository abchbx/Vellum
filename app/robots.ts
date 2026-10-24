import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vellum.example.com';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app', '/api', '/u/'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
