import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { reviewSchema } from '@/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Abuse protection against review-spam scripts. See
// src/lib/rate-limit.ts for the documented single-instance limitation.
const REVIEW_ATTEMPT_LIMIT = 20;
const REVIEW_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = rateLimit(`review-create:${ip}`, REVIEW_ATTEMPT_LIMIT, REVIEW_WINDOW_MS);
    if (!limitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid review data.');
    }

    const { trackingToken, productId, rating, comment } = parsed.data;

    const order = await db.order.findUnique({
      where: { trackingToken },
      include: { items: true },
    });

    if (!order) {
      return apiError('Order not found.', 404);
    }
    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
      return apiError('You can only review products after your order has been delivered.', 422);
    }
    const wasOrdered = order.items.some((item: any) => item.productId === productId);
    if (!wasOrdered) {
      return apiError('This product was not part of your order.', 422);
    }

    const existing = await db.review.findUnique({
      where: { orderId_productId: { orderId: order.id, productId } },
    });
    if (existing) {
      return apiError('You have already reviewed this product for this order.', 409);
    }

    const review = await db.review.create({
      data: {
        orderId: order.id,
        productId,
        customerName: order.customerName,
        rating,
        comment: comment?.trim() || null,
        isApproved: false, // reviews are moderated by admin before appearing publicly
      },
    });

    await db.notification.create({
      data: {
        type: 'NEW_REVIEW',
        title: 'New review received',
        message: `${order.customerName} left a ${rating}-star review for order ${order.orderNumber}.`,
        relatedOrderId: order.id,
      },
    });

    return apiSuccess({ id: review.id }, 201);
  } catch (error) {
    console.error('POST /api/reviews failed:', error);
    return apiError('Could not submit review.', 500);
  }
}
