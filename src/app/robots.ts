import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin panel, internal API routes, and private per-order
        // tracking/confirmation/review pages must never be indexed.
        // The token pages also carry a page-level noindex meta tag
        // (see their layout.tsx files) as a second layer of defense.
        disallow: ['/admin', '/admin/', '/api/', '/track', '/order-confirmation', '/review'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
