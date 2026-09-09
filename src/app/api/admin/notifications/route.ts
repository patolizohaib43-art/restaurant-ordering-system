import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100);
    const since = searchParams.get('since'); // ISO timestamp — for "anything new since I last checked?"

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        where: since ? { createdAt: { gt: new Date(since) } } : undefined,
      }),
      db.notification.count({ where: { isRead: false } }),
    ]);

    return apiSuccess({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        relatedOrderId: n.relatedOrderId,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/admin/notifications failed:', error);
    return apiError('Could not load notifications.', 500);
  }
}
