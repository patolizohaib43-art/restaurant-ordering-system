import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { serializeProduct, getPopularProducts, getFeaturedProducts } from '@/lib/queries';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim();
    const featured = searchParams.get('featured') === 'true';
    const popular = searchParams.get('popular') === 'true';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

    if (popular) {
      return apiSuccess(await getPopularProducts(limit));
    }
    if (featured && !category && !search) {
      return apiSuccess(await getFeaturedProducts(limit));
    }

    const where: Prisma.ProductWhereInput = { isAvailable: true };
    if (category) where.category = { slug: category };
    if (featured) where.isFeatured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: limit,
    });

    return apiSuccess(products.map(serializeProduct));
  } catch (error) {
    console.error('GET /api/products failed:', error);
    return apiError('Could not load products.', 500);
  }
}
