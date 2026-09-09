import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { resolveDateRange, getSalesTotals, SALES_EXCLUDED_STATUSES } from '@/lib/reports';

/**
 * Item 9 — Admin Reports Dashboard summary: today / yesterday / this week /
 * this month sales plus lifetime order counts, all computed live from the
 * database (never hard-coded).
 */
export async function GET() {
  try {
    const noFilters = {};

    const [today, yesterday, thisWeek, thisMonth, totalOrders, completedOrders, cancelledOrders, rejectedOrders] =
      await Promise.all([
        getSalesTotals(resolveDateRange('today'), noFilters),
        getSalesTotals(resolveDateRange('yesterday'), noFilters),
        getSalesTotals(resolveDateRange('last7'), noFilters),
        getSalesTotals(resolveDateRange('thisMonth'), noFilters),
        db.order.count(),
        db.order.count({ where: { status: { in: ['DELIVERED', 'COMPLETED'] } } }),
        db.order.count({ where: { status: 'CANCELLED' } }),
        db.order.count({ where: { status: 'REJECTED' } }),
      ]);

    const overallAgg = await db.order.aggregate({
      where: { status: { notIn: [...SALES_EXCLUDED_STATUSES] } },
      _avg: { totalAmount: true },
    });

    return apiSuccess({
      todaySales: today.totalSales,
      yesterdaySales: yesterday.totalSales,
      thisWeekSales: thisWeek.totalSales,
      thisMonthSales: thisMonth.totalSales,
      totalOrders,
      completedOrders,
      cancelledOrders,
      rejectedOrders,
      averageOrderValue: (overallAgg._avg.totalAmount ?? 0).toString(),
    });
  } catch (error) {
    console.error('GET /api/admin/reports/overview failed:', error);
    return apiError('Could not load reports overview.', 500);
  }
}
