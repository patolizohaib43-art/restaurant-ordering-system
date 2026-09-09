import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST() {
  try {
    await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return apiSuccess({ markedAllRead: true });
  } catch (error) {
    console.error('POST /api/admin/notifications/mark-all-read failed:', error);
    return apiError('Could not update notifications.', 500);
  }
}
