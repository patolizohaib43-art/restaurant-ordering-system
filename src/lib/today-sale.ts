import { db } from '@/lib/db';
import type { BusinessSession } from '@/lib/business-day';

const COMPLETED = ['DELIVERED', 'COMPLETED'] as const;
const ACTIVE = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as const;

const num = (v: unknown) => Number(v ?? 0);

/**
 * "Today Sale" figures for one business session (see business-day.ts).
 *
 * Only COMPLETED sales count: orders that reached Delivered/Completed.
 * Online (Easypaisa/JazzCash) orders additionally need paymentStatus
 * PAID, so an unverified/failed online payment never inflates the total.
 * Pending, in-progress, cancelled and rejected orders are excluded from
 * the money figures. Membership in a session is decided by when the
 * order was placed (createdAt), matching the existing Reports rules.
 */
export async function getSessionSale(session: BusinessSession) {
  const inSession = { createdAt: { gte: session.start, lt: session.end } };

  const [cod, online, activeOrders, totalOrders] = await Promise.all([
    db.order.aggregate({
      where: { ...inSession, status: { in: [...COMPLETED] }, paymentMethod: 'CASH_ON_DELIVERY' },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    db.order.aggregate({
      where: {
        ...inSession,
        status: { in: [...COMPLETED] },
        paymentMethod: 'ONLINE_WALLET',
        paymentStatus: 'PAID',
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    db.order.count({ where: { ...inSession, status: { in: [...ACTIVE] } } }),
    db.order.count({ where: inSession }),
  ]);

  const codAmount = num(cod._sum.totalAmount);
  const onlineAmount = num(online._sum.totalAmount);

  return {
    sessionStart: session.start.toISOString(),
    sessionEnd: session.closeAt.toISOString(),
    isOpenNow: session.isOpenNow,
    openTime: session.openTime,
    closeTime: session.closeTime,
    completedOrders: cod._count._all + online._count._all,
    totalSales: (codAmount + onlineAmount).toString(),
    codOrders: cod._count._all,
    codAmount: codAmount.toString(),
    onlineOrders: online._count._all,
    onlineAmount: onlineAmount.toString(),
    activeOrders,
    totalOrders,
  };
}
