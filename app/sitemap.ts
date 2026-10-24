import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vellum.example.com';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/u/demo`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];
}
