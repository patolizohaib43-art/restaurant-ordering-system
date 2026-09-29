import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getRestaurantSettings } from '@/lib/settings';
import { getBusinessSession } from '@/lib/business-day';
import { getSessionSale } from '@/lib/today-sale';

export async function GET() {
  try {
    const now = new Date();
    // "Today" = the restaurant's BUSINESS DAY session (e.g. 6 PM → 2 AM),
    // computed in the restaurant's configured timezone — see
    // src/lib/business-day.ts. Not the calendar date.
    const { timezone, openingHours } = await getRestaurantSettings();
    const session = getBusinessSession(now, timezone, openingHours);
    const todaySale = await getSessionSale(session);

    const [
      ordersToday,
      pendingCount,
      preparingCount,
      completedCount,
      cancelledCount,
      totalSalesAgg,
      recentOrders,
      recentReviews,
    ] = await Promise.all([
      db.order.count({ where: { createdAt: { gte: session.start, lt: session.end } } }),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.count({ where: { status: { in: ['CONFIRMED', 'PREPARING'] } } }),
      db.order.count({ where: { status: { in: ['DELIVERED', 'COMPLETED'] } } }),
      db.order.count({ where: { status: { in: ['CANCELLED', 'REJECTED'] } } }),
      db.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
      }),
      db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      db.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { product: { select: { name: true } } },
      }),
    ]);

    return apiSuccess({
      ordersToday,
      pendingCount,
      preparingCount,
      completedCount,
      cancelledCount,
      todaySales: todaySale.totalSales,
      todaySale,
      totalSales: (totalSalesAgg._sum.totalAmount ?? 0).toString(),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        totalAmount: o.totalAmount.toString(),
        createdAt: o.createdAt.toISOString(),
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        productName: r.product?.name ?? 'Unknown product',
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        isApproved: r.isApproved,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard failed:', error);
    return apiError('Could not load dashboard.', 500);
  }
}
