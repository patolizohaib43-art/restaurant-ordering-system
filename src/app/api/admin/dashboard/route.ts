import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getRestaurantTimeZone, startOfDayInTimeZone } from '@/lib/timezone';
import { getRestaurantSettings } from '@/lib/settings';

export async function GET() {
  try {
    const now = new Date();
    // "Today" is computed in the restaurant's configured timezone (see
    // src/lib/timezone.ts) so this figure always matches the Reports
    // page's "Today" figure, regardless of server/deployment timezone.
    // Prefers the admin-editable Settings value over the env var.
    const { timezone } = await getRestaurantSettings();
    const todayStart = startOfDayInTimeZone(now, getRestaurantTimeZone(timezone));

    const [
      ordersToday,
      pendingCount,
      preparingCount,
      completedCount,
      cancelledCount,
      todaySalesAgg,
      totalSalesAgg,
      recentOrders,
      recentReviews,
    ] = await Promise.all([
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.count({ where: { status: { in: ['CONFIRMED', 'PREPARING'] } } }),
      db.order.count({ where: { status: { in: ['DELIVERED', 'COMPLETED'] } } }),
      db.order.count({ where: { status: { in: ['CANCELLED', 'REJECTED'] } } }),
      db.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: todayStart }, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      }),
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
      todaySales: (todaySalesAgg._sum.totalAmount ?? 0).toString(),
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
