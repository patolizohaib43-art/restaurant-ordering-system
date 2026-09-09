import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const reviews = await db.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
      take: 100,
    });

    return apiSuccess(
      reviews.map((r) => ({
        id: r.id,
        productName: r.product?.name ?? 'Unknown product',
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        isApproved: r.isApproved,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/reviews failed:', error);
    return apiError('Could not load reviews.', 500);
  }
}
