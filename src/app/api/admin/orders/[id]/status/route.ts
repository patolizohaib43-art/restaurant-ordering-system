import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { isValidTransition } from '@/lib/order-status';
import { getAdminSession } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  status: z.enum([
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'REFUNDED',
  ]),
  note: z.string().max(300).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid status update.');
    }
    const { status, note } = parsed.data;

    const order = await db.order.findUnique({ where: { id: params.id } });
    if (!order) return apiError('Order not found.', 404);

    if (!isValidTransition(order.status, status)) {
      return apiError(
        `Cannot move an order from "${order.status}" to "${status}".`,
        422
      );
    }

    const session = await getAdminSession();

      const updated = await db.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: params.id },
        data: { status },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status,
          note: note || null,
          changedById: session?.adminId ?? null,
        },
      });
      return result;
    });

    return apiSuccess({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id]/status failed:', error);
    return apiError('Could not update order status.', 500);
  }
}
