import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminSession } from '@/lib/auth';
import { getRestaurantSettings } from '@/lib/settings';
import { startOfDayInTimeZone, getRestaurantTimeZone } from '@/lib/timezone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Clear TEST orders / reset order history before going live.
 *
 * SUPER_ADMIN only (checked here on top of the /api/admin/* login check in
 * src/middleware.ts). Deletes ONLY order data:
 *   orders (+ their items, item add-ons and status history via the
 *   existing ON DELETE CASCADE), reviews attached to those orders, and
 *   the admin notifications that point at them.
 * Coupon usage counters are rolled back so test orders don't consume a
 * coupon's usage limit. Products, categories, deals, coupons (config),
 * delivery zones, settings and admin accounts are never touched.
 */

const CONFIRM_TEXT = 'DELETE';

async function requireSuperAdmin() {
  const session = await getAdminSession();
  if (!session) return { error: apiError('Not authenticated.', 401) };
  if (session.role !== 'SUPER_ADMIN') {
    return { error: apiError('Only the main admin can clear order history.', 403) };
  }
  return { session };
}

async function buildWhere(before: string | null) {
  if (!before) return {};
  // Cutoff = start of that day in the restaurant's timezone; orders placed
  // BEFORE it are deleted, that day and later are kept.
  const { timezone } = await getRestaurantSettings();
  const tz = getRestaurantTimeZone(timezone);
  // Noon UTC of the chosen date falls on that same calendar date in any
  // real-world timezone, so it safely identifies the day to start from.
  const cutoff = startOfDayInTimeZone(new Date(`${before}T12:00:00Z`), tz);
  return { createdAt: { lt: cutoff } };
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

// Preview: how many orders would be deleted.
export async function GET(request: NextRequest) {
  try {
    const guard = await requireSuperAdmin();
    if (guard.error) return guard.error;
    const before = new URL(request.url).searchParams.get('before');
    if (before && !dateRe.test(before)) return apiError('Invalid date.');
    const count = await db.order.count({ where: await buildWhere(before) });
    return apiSuccess({ orderCount: count });
  } catch (error) {
    console.error('GET /api/admin/orders/reset failed:', error);
    return apiError('Could not count orders.', 500);
  }
}

const schema = z.object({
  mode: z.enum(['ALL', 'BEFORE_DATE']),
  beforeDate: z.string().regex(dateRe).optional(),
  confirmText: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await requireSuperAdmin();
    if (guard.error) return guard.error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError('Invalid request.');
    const { mode, beforeDate, confirmText } = parsed.data;

    if (confirmText !== CONFIRM_TEXT) {
      return apiError(`Type ${CONFIRM_TEXT} to confirm.`);
    }
    if (mode === 'BEFORE_DATE' && !beforeDate) {
      return apiError('Choose a cutoff date.');
    }

    const where = await buildWhere(mode === 'BEFORE_DATE' ? beforeDate! : null);

    const result = await db.$transaction(
      async (tx) => {
        const orders = await tx.order.findMany({
          where,
          select: { id: true, couponId: true },
        });
        const ids = orders.map((o) => o.id);
        if (ids.length === 0) return { deletedOrders: 0, deletedReviews: 0, deletedNotifications: 0 };

        // Roll back coupon usage counters caused by these orders.
        const perCoupon = new Map<string, number>();
        for (const o of orders) {
          if (o.couponId) perCoupon.set(o.couponId, (perCoupon.get(o.couponId) ?? 0) + 1);
        }
        for (const [couponId, n] of perCoupon) {
          const c = await tx.coupon.findUnique({ where: { id: couponId }, select: { usedCount: true } });
          if (c) {
            await tx.coupon.update({
              where: { id: couponId },
              data: { usedCount: Math.max(0, c.usedCount - n) },
            });
          }
        }

        const reviews = await tx.review.deleteMany({ where: { orderId: { in: ids } } });
        const notifications = await tx.notification.deleteMany({
          where: { relatedOrderId: { in: ids } },
        });
        // order_items, order_item_addons and order_status_history are removed
        // by ON DELETE CASCADE — no orphan rows are left behind.
        const deleted = await tx.order.deleteMany({ where: { id: { in: ids } } });

        return {
          deletedOrders: deleted.count,
          deletedReviews: reviews.count,
          deletedNotifications: notifications.count,
        };
      },
      { timeout: 60000, maxWait: 10000 }
    );

    // Purge any cached render/data for order-related pages so the
    // dashboard, orders list and reports show the cleared state.
    for (const path of ['/admin', '/admin/orders', '/admin/reports', '/admin/notifications', '/']) {
      revalidatePath(path);
    }
    revalidatePath('/admin', 'layout');

    return apiSuccess(result);
  } catch (error) {
    console.error('POST /api/admin/orders/reset failed:', error);
    return apiError('Could not clear orders. Nothing was deleted.', 500);
  }
}
