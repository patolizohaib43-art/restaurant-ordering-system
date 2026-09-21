import { NextRequest } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { orderLookupSchema } from '@/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Modest rate limit: phone-only lookup is guessable-by-brute-force in
// theory, so throttle it per IP. See src/lib/rate-limit.ts for the
// documented single-instance limitation on serverless hosts.
const LOOKUP_ATTEMPT_LIMIT = 20;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

// "Active/incomplete" — anything that isn't a final state. Kept local to
// this route since it's the only place that needs this specific grouping.
const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

/**
 * Customers here have no account/login. This is how they check on an
 * order: enter the SAME phone number used to place it — no order number
 * required. Only that phone number's own active (not yet
 * delivered/completed/cancelled) orders are returned, scoped by an exact
 * normalized-phone match against the order's stored customerPhone, so
 * one customer can never see another's orders. Only minimal list fields
 * are returned, never full order contents, to keep this endpoint from
 * becoming a data-exposure risk — the customer taps through to a
 * specific order (via its tracking token) for full details.
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

    const normalizedPhone = normalizePhone(parsed.data.phone);
    if (normalizedPhone.length < 6) {
      return apiError('Enter a valid phone number.', 400);
    }

    // Postgres has no normalized-phone column to index on, so this pulls
    // a bounded, already status+date-filtered candidate set from the DB
    // and does the final exact phone match in JS — fine at this scale
    // (one restaurant, small active-order count) without a schema change.
    const RECENT_WINDOW_DAYS = 14;
    const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const candidates = await db.order.findMany({
      where: { status: { in: ACTIVE_STATUSES }, createdAt: { gte: since } },
      select: {
        trackingToken: true,
        orderNumber: true,
        customerPhone: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        orderType: true,
        items: { select: { productName: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // bounded scan window, not a hard cap on results returned
    });

    const matches = candidates
      .filter((o) => normalizePhone(o.customerPhone) === normalizedPhone)
      .map((o) => ({
        trackingToken: o.trackingToken,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount.toString(),
        createdAt: o.createdAt.toISOString(),
        orderType: o.orderType,
        items: o.items.map((i) => ({ name: i.productName, quantity: i.quantity })),
      }));

    if (matches.length === 0) {
      return apiError('No active orders found for that phone number.', 404);
    }

    return apiSuccess({ orders: matches });
  } catch (error) {
    console.error('POST /api/orders/lookup failed:', error);
    return apiError('Could not look up order.', 500);
  }
}
