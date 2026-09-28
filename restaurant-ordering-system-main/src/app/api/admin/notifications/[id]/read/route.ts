import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    await db.notification.update({ where: { id: params.id }, data: { isRead: true } });
    return apiSuccess({ read: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Notification not found.', 404);
    console.error('PATCH /api/admin/notifications/[id]/read failed:', error);
    return apiError('Could not update notification.', 500);
  }
}
