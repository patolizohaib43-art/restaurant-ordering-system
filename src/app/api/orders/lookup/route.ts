import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { orderLookupSchema } from '@/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Modest rate limit: this endpoint is guessable-by-brute-force in theory
// (order number + phone), so throttle it per IP. See src/lib/rate-limit.ts
// for the documented single-instance limitation on serverless hosts.
const LOOKUP_ATTEMPT_LIMIT = 20;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

/**
 * Customers here have no account/login, so their tracking link is the
 * only way to check an order — this route lets them recover it if it's
 * lost, by proving they know BOTH the order number and the phone number
 * used to place it. Only the tracking token is returned, never order
 * contents, to keep this endpoint from becoming a data-exposure risk.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = rateLimit(`order-lookup:${ip}`, LOOKUP_ATTEMPT_LIMIT, LOOKUP_WINDOW_MS);
    if (!limitResult.success) {
      return apiError('Too many attempts. Please try again later.', 429);
    }

    const body = await request.json();
    const parsed = orderLookupSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
    }

    const { orderNumber, phone } = parsed.data;
    const normalizedPhone = normalizePhone(phone);

    const order = await db.order.findFirst({
      where: { orderNumber: { equals: orderNumber, mode: 'insensitive' } },
      select: { trackingToken: true, customerPhone: true },
    });

    if (!order || normalizePhone(order.customerPhone) !== normalizedPhone) {
      return apiError('No matching order found. Check the order number and phone number.', 404);
    }

    return apiSuccess({ trackingToken: order.trackingToken });
  } catch (error) {
    console.error('POST /api/orders/lookup failed:', error);
    return apiError('Could not look up order.', 500);
  }
}
