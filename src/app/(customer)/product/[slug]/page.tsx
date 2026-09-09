import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductDetailClient } from '@/components/customer/ProductDetailClient';
import { StarRatingDisplay } from '@/components/customer/StarRating';
import { RatingDistribution } from '@/components/customer/RatingDistribution';
import { formatRelativeTime } from '@/utils';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: {
      addons: { where: { isAvailable: true }, orderBy: { name: 'asc' } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!product || !product.isAvailable) notFound();

  // Average/count/distribution must reflect ALL approved reviews, not just
  // the latest 20 fetched above for display — otherwise the headline
  // rating would silently drift as older reviews scroll out of the list.
  const [ratingCount, ratingGroups] = await Promise.all([
    db.review.count({ where: { productId: product.id, isApproved: true } }),
    db.review.groupBy({
      by: ['rating'],
      where: { productId: product.id, isApproved: true },
      _count: { _all: true },
    }),
  ]);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingGroups.find((g: any) => g.rating === star)?._count._all ?? 0,
  }));
  const ratingSum = distribution.reduce((sum, d) => sum + d.star * d.count, 0);
  const averageRating = ratingCount > 0 ? ratingSum / ratingCount : null;

  return (
    <div>
      <ProductDetailClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price.toString(),
          discountPrice: product.discountPrice?.toString() ?? null,
          imageUrl: product.imageUrl,
          preparationTime: product.preparationTime,
          addons: product.addons.map((a: any) => ({
            id: a.id,
            name: a.name,
            price: a.price.toString(),
            maxQuantity: a.maxQuantity,
          })),
        }}
      />

      {ratingCount > 0 && (
        <div className="border-t border-gray-100 px-4 py-5">
          <div className="mb-1 flex items-center gap-2">
            <StarRatingDisplay rating={averageRating ?? 0} size={18} />
            <span className="text-sm font-semibold text-gray-900">
              {averageRating?.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({ratingCount} reviews)</span>
          </div>
          <div className="mb-4 mt-3 max-w-xs">
            <RatingDistribution distribution={distribution} total={ratingCount} />
          </div>
          <div className="space-y-4">
            {product.reviews.map((review: any) => (
              <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{review.customerName}</span>
                  <StarRatingDisplay rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-1.5 text-sm text-gray-600">{review.comment}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {formatRelativeTime(review.createdAt.toISOString())}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
