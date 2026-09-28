import { NextRequest } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { orderLookupSchema } from '@/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/phone';

const LOOKUP_ATTEMPT_LIMIT = 60;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

// "Active/incomplete" — anything that isn't a final state. Delivered,
// Completed, Rejected, Cancelled and Refunded orders never appear here.
const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

const SELECT = {
  trackingToken: true,
  orderNumber: true,
  customerPhone: true,
  customerPhoneNormalized: true,
  status: true,
  totalAmount: true,
  createdAt: true,
  orderType: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentProvider: true,
  estimatedDeliveryTime: true,
  items: { select: { productName: true, quantity: true } },
} as const;

/**
 * Customers have no account. They can see their ACTIVE orders using
 * either their mobile number (the one used at checkout) or the tracking
 * token(s) remembered on this device — a token is the same secret as the
 * customer's tracking link. Only orders whose stored phone matches (or
 * whose secret token is supplied) are returned, so nobody can see other
 * customers' orders. Only non-sensitive fields are returned: no name,
 * address or phone.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = rateLimit(`order-lookup:${ip}`, LOOKUP_ATTEMPT_LIMIT, LOOKUP_WINDOW_MS);
    if (!limitResult.success) {
      return apiError('Too many attempts. Please try again later.', 429);
    }

    const parsed = orderLookupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
    }
    const { phone, tokens } = parsed.data;

    let normalized = '';
    if (phone) {
      normalized = normalizePhone(phone);
      if (normalized.length < 7) return apiError('Enter a valid mobile number.', 400);
    }

    const byPhone = normalized
      ? db.order.findMany({
          where: {
            status: { in: ACTIVE_STATUSES },
            // Indexed match for new orders; orders created before the
            // normalized column existed (null) are matched in JS below.
            OR: [{ customerPhoneNormalized: normalized }, { customerPhoneNormalized: null }],
          },
          select: SELECT,
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : Promise.resolve([]);

    const byToken =
      tokens && tokens.length > 0
        ? db.order.findMany({
            where: { trackingToken: { in: tokens }, status: { in: ACTIVE_STATUSES } },
            select: SELECT,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]);

    const [phoneRows, tokenRows] = await Promise.all([byPhone, byToken]);

    const phoneMatches = phoneRows.filter(
      (o) => (o.customerPhoneNormalized ?? normalizePhone(o.customerPhone)) === normalized
    );

    const seen = new Set<string>();
    const orders = [...tokenRows, ...phoneMatches]
      .filter((o) => (seen.has(o.trackingToken) ? false : (seen.add(o.trackingToken), true)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((o) => ({
        trackingToken: o.trackingToken,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount.toString(),
        createdAt: o.createdAt.toISOString(),
        orderType: o.orderType,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        paymentProvider: o.paymentProvider,
        estimatedDeliveryTime: o.estimatedDeliveryTime?.toISOString() ?? null,
        items: o.items.map((i) => ({ name: i.productName, quantity: i.quantity })),
      }));

    // An empty list is a normal answer ("no active orders"), not an error.
    return apiSuccess({ orders });
  } catch (error) {
    console.error('POST /api/orders/lookup failed:', error);
    return apiError('Could not look up order.', 500);
  }
}
