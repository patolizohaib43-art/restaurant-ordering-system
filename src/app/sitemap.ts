import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.product.findMany({
      where: { isAvailable: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/menu`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/deals`, changeFrequency: 'daily', priority: 0.7 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map(
    (c: { slug: string; updatedAt: Date }) => ({
      url: `${APP_URL}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'daily',
      priority: 0.6,
    })
  );

  const productRoutes: MetadataRoute.Sitemap = products.map(
    (p: { slug: string; updatedAt: Date }) => ({
      url: `${APP_URL}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.5,
    })
  );

  // Cart, checkout, order tracking, and order confirmation are excluded on
  // purpose — they're either private/per-customer or have no useful
  // canonical content for search engines.
  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
