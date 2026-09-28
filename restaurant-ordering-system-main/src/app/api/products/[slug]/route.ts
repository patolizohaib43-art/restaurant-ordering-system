import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const product = await db.product.findUnique({
      where: { slug: params.slug },
      include: {
        category: { select: { name: true, slug: true } },
        addons: { where: { isAvailable: true }, orderBy: { name: 'asc' } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, customerName: true, rating: true, comment: true, createdAt: true },
        },
      },
    });

    if (!product || !product.isAvailable) {
      return apiError('Product not found.', 404);
    }

    const ratingCount = product.reviews.length;
    const averageRating =
      ratingCount > 0
        ? product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingCount
        : null;

    return apiSuccess({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price.toString(),
      discountPrice: product.discountPrice?.toString() ?? null,
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable,
      preparationTime: product.preparationTime,
      calories: product.calories,
      category: product.category,
      addons: product.addons.map((a: any) => ({
        id: a.id,
        name: a.name,
        price: a.price.toString(),
        maxQuantity: a.maxQuantity,
      })),
      reviews: product.reviews.map((r: any) => ({
        id: r.id,
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      averageRating,
      ratingCount,
    });
  } catch (error) {
    console.error('GET /api/products/[slug] failed:', error);
    return apiError('Could not load product.', 500);
  }
}
