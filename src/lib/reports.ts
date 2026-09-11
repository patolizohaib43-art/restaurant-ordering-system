import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getRestaurantTimeZone, startOfDayInTimeZone, startOfMonthInTimeZone, getDatePartsInTimeZone } from '@/lib/timezone';

/**
 * Orders in these statuses never counted as real revenue (order never
 * happened / was refused). Kept identical to the exclusion rule already
 * used by the Phase 4 admin dashboard (`/api/admin/dashboard`) so the
 * "Today's Sales" figure never disagrees between Dashboard and Reports.
 */
export const SALES_EXCLUDED_STATUSES = ['CANCELLED', 'REJECTED'] as const;

export const COMPLETED_STATUSES = ['DELIVERED', 'COMPLETED'] as const;

export interface ResolvedRange {
  start: Date;
  end: Date;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// All "today"/"this month" boundaries are computed in the restaurant's
// configured timezone (RESTAURANT_TIMEZONE), not the server process's
// local timezone — see src/lib/timezone.ts for why this matters.
function startOfDay(d: Date, timeZone?: string | null): Date {
  return startOfDayInTimeZone(d, getRestaurantTimeZone(timeZone));
}

/** Resolves a report date-range key (+ optional custom bounds) into concrete start/end Dates. */
export function resolveDateRange(
  range: string | null | undefined,
  from?: string | null,
  to?: string | null,
  timeZoneOverride?: string | null
): ResolvedRange {
  const now = new Date();
  const timeZone = getRestaurantTimeZone(timeZoneOverride);
  const todayStart = startOfDay(now, timeZoneOverride);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS - 1);

  switch (range) {
    case 'yesterday': {
      const start = new Date(todayStart.getTime() - DAY_MS);
      const end = new Date(todayStart.getTime() - 1);
      return { start, end, label: 'Yesterday' };
    }
    case 'last7':
      return { start: new Date(todayStart.getTime() - 6 * DAY_MS), end: todayEnd, label: 'Last 7 days' };
    case 'last30':
      return { start: new Date(todayStart.getTime() - 29 * DAY_MS), end: todayEnd, label: 'Last 30 days' };
    case 'thisMonth':
      return { start: startOfMonthInTimeZone(now, timeZone), end: todayEnd, label: 'This month' };
    case 'custom': {
      const start = from ? startOfDay(new Date(from), timeZoneOverride) : todayStart;
      const end = to
        ? new Date(startOfDay(new Date(to), timeZoneOverride).getTime() + DAY_MS - 1)
        : todayEnd;
      return { start, end, label: 'Custom range' };
    }
    case 'today':
    default:
      return { start: todayStart, end: todayEnd, label: 'Today' };
  }
}

export interface ReportFilters {
  status?: string | null;
  paymentMethod?: string | null;
  orderType?: string | null;
  categoryId?: string | null;
  productId?: string | null;
}

/** Builds a shared Prisma `where` clause for Order-level report queries. */
export function buildOrderWhere(
  range: ResolvedRange,
  filters: ReportFilters,
  opts: { excludeCancelled?: boolean } = {}
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };

  if (filters.status) {
    where.status = filters.status as Prisma.OrderWhereInput['status'];
  } else if (opts.excludeCancelled) {
    where.status = { notIn: [...SALES_EXCLUDED_STATUSES] } as Prisma.OrderWhereInput['status'];
  }
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod as Prisma.OrderWhereInput['paymentMethod'];
  if (filters.orderType) where.orderType = filters.orderType as Prisma.OrderWhereInput['orderType'];

  if (filters.productId || filters.categoryId) {
    where.items = {
      some: {
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.categoryId ? { product: { categoryId: filters.categoryId } } : {}),
      },
    };
  }

  return where;
}

/** Item 10 — core Sales Report numbers for the resolved range/filters. */
export async function getSalesTotals(range: ResolvedRange, filters: ReportFilters) {
  const baseWhere = buildOrderWhere(range, filters, { excludeCancelled: true });
  // Cancelled/completed/rejected breakdown counts intentionally ignore any
  // status filter (same reasoning as getOrderStatusDistribution) — a
  // status filter narrows the top-line sales totals, but the breakdown
  // exists precisely to show the split across statuses.
  const { status: _ignored, ...rest } = filters;
  const unfiltered = buildOrderWhere(range, rest);

  const [salesAgg, cancelledCount, completedCount, rejectedCount] = await Promise.all([
    db.order.aggregate({
      where: baseWhere,
      _sum: { totalAmount: true, discountAmount: true, deliveryFee: true },
      _count: { _all: true },
      _avg: { totalAmount: true },
    }),
    db.order.count({ where: { ...unfiltered, status: 'CANCELLED' } }),
    db.order.count({ where: { ...unfiltered, status: { in: [...COMPLETED_STATUSES] } } }),
    db.order.count({ where: { ...unfiltered, status: 'REJECTED' } }),
  ]);

  return {
    totalSales: (salesAgg._sum.totalAmount ?? 0).toString(),
    orderCount: salesAgg._count._all,
    averageOrderValue: (salesAgg._avg.totalAmount ?? 0).toString(),
    discountGiven: (salesAgg._sum.discountAmount ?? 0).toString(),
    deliveryCharges: (salesAgg._sum.deliveryFee ?? 0).toString(),
    completedOrders: completedCount,
    cancelledOrders: cancelledCount,
    rejectedOrders: rejectedCount,
  };
}

/** Item 11 — order status distribution for the resolved range/filters. */
export async function getOrderStatusDistribution(range: ResolvedRange, filters: ReportFilters) {
  // Status itself is intentionally excluded from the filter here — the
  // whole point of this report is to show the breakdown ACROSS statuses.
  const { status: _ignored, ...rest } = filters;
  const where = buildOrderWhere(range, rest);

  const rows = await db.order.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });

  const map = new Map(rows.map((r) => [r.status, r._count._all]));
  const ALL_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
    'REFUNDED',
  ];

  return ALL_STATUSES.map((status) => ({ status, count: map.get(status as any) ?? 0 }));
}

/**
 * Item 12 & 13 — per-product sales aggregated once, shared by both the
 * Top Products list and the Category Performance breakdown so the range
 * only needs to be queried a single time.
 */
export async function getProductSales(range: ResolvedRange, filters: ReportFilters) {
  const orderWhere = buildOrderWhere(range, filters, { excludeCancelled: true });

  const grouped = await db.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: filters.productId ? filters.productId : { not: null },
      ...(filters.categoryId ? { product: { categoryId: filters.categoryId } } : {}),
      order: orderWhere,
    },
    _sum: { quantity: true, subtotal: true },
  });

  const productIds = grouped.map((g) => g.productId).filter((id): id is string => !!id);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, category: { select: { id: true, name: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return grouped
    .map((g) => {
      const product = g.productId ? productMap.get(g.productId) : undefined;
      return {
        productId: g.productId,
        productName: product?.name ?? 'Deleted product',
        categoryId: product?.category?.id ?? null,
        categoryName: product?.category?.name ?? 'Uncategorized',
        quantitySold: g._sum.quantity ?? 0,
        revenue: (g._sum.subtotal ?? new Prisma.Decimal(0)).toString(),
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold);
}

export function topProductsFrom(productSales: Awaited<ReturnType<typeof getProductSales>>, limit = 10) {
  return productSales.slice(0, limit).map((p, i) => ({ rank: i + 1, ...p }));
}

export function categoryPerformanceFrom(productSales: Awaited<ReturnType<typeof getProductSales>>) {
  const byCategory = new Map<string, { categoryId: string | null; categoryName: string; revenue: number; quantitySold: number }>();
  for (const p of productSales) {
    const key = p.categoryId ?? 'none';
    const existing = byCategory.get(key) ?? {
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      revenue: 0,
      quantitySold: 0,
    };
    existing.revenue += parseFloat(p.revenue);
    existing.quantitySold += p.quantitySold;
    byCategory.set(key, existing);
  }
  return [...byCategory.values()].sort((a, b) => b.revenue - a.revenue);
}

/**
 * Item 16 — daily sales totals for a chart. Uses indexed createdAt/status,
 * aggregated in SQL. Buckets by calendar day in the restaurant's own
 * timezone (via `AT TIME ZONE`) so a day's bucket matches what the admin
 * sees as "today"/"yesterday" in the reports UI, regardless of what
 * timezone Postgres or the app server happen to be running in.
 */
export async function getDailySales(range: ResolvedRange, timeZoneOverride?: string | null) {
  const timeZone = getRestaurantTimeZone(timeZoneOverride);

  const rows = await db.$queryRaw<{ day: Date; total: number; orders: number }[]>`
    SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE ${timeZone}) AS day,
           COALESCE(SUM("totalAmount"), 0)::float8 AS total,
           COUNT(*)::int AS orders
    FROM orders
    WHERE "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
      AND status NOT IN ('CANCELLED', 'REJECTED')
    GROUP BY day
    ORDER BY day ASC
  `;

  // Postgres already returned `day` as the restaurant's local wall-clock
  // midnight (via AT TIME ZONE above); node-postgres parses a "timestamp
  // without time zone" value using UTC getters, so read it back the same
  // way rather than re-converting it through a timezone a second time.
  const dayKey = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const byDay = new Map(
    rows.map((r) => {
      const d = new Date(r.day);
      return [dayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), r];
    })
  );

  const days: { date: string; total: number; orders: number }[] = [];
  for (let t = startOfDay(range.start).getTime(); t <= range.end.getTime(); t += DAY_MS) {
    const parts = getDatePartsInTimeZone(new Date(t), timeZone);
    const key = dayKey(parts.year, parts.month, parts.day);
    const row = byDay.get(key);
    days.push({
      date: key,
      total: row?.total ?? 0,
      orders: row?.orders ?? 0,
    });
  }
  return days;
}

/** Item 15 — coupon usage/discount within the resolved range. */
export async function getCouponAnalytics(range: ResolvedRange) {
  const rows = await db.order.groupBy({
    by: ['couponId'],
    where: {
      createdAt: { gte: range.start, lte: range.end },
      couponId: { not: null },
      status: { notIn: [...SALES_EXCLUDED_STATUSES] },
    },
    _count: { _all: true },
    _sum: { discountAmount: true },
  });

  const couponIds = rows.map((r) => r.couponId).filter((id): id is string => !!id);
  const coupons = await db.coupon.findMany({ where: { id: { in: couponIds } } });
  const couponMap = new Map(coupons.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const coupon = r.couponId ? couponMap.get(r.couponId) : undefined;
      return {
        couponId: r.couponId,
        code: coupon?.code ?? 'Deleted coupon',
        ordersGenerated: r._count._all,
        discountGiven: (r._sum.discountAmount ?? new Prisma.Decimal(0)).toString(),
      };
    })
    .sort((a, b) => b.ordersGenerated - a.ordersGenerated);
}

/** Item 14 — deal redemption performance within the resolved range. */
export async function getDealPerformance(range: ResolvedRange) {
  const rows = await db.order.groupBy({
    by: ['dealId'],
    where: {
      createdAt: { gte: range.start, lte: range.end },
      dealId: { not: null },
      status: { notIn: [...SALES_EXCLUDED_STATUSES] },
    },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });

  const dealIds = rows.map((r) => r.dealId).filter((id): id is string => !!id);
  const deals = await db.deal.findMany({ where: { id: { in: dealIds } } });
  const dealMap = new Map(deals.map((d) => [d.id, d]));

  const results = rows
    .map((r) => {
      const deal = r.dealId ? dealMap.get(r.dealId) : undefined;
      return {
        dealId: r.dealId,
        title: deal?.title ?? 'Deleted deal',
        dealsSold: r._count._all,
        revenue: (r._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
      };
    })
    .sort((a, b) => b.dealsSold - a.dealsSold);

  return {
    deals: results,
    mostPopularDeal: results[0]?.title ?? null,
    totalDealsSold: results.reduce((s, r) => s + r.dealsSold, 0),
    totalDealRevenue: results.reduce((s, r) => s + parseFloat(r.revenue), 0).toFixed(2),
  };
}

/** Escapes a value for a CSV cell. */
export function csvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','));
  }
  return lines.join('\n');
}
