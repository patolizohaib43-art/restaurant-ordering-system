import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

const schema = z.object({
  action: z.enum(['MARK_PAID', 'MARK_FAILED']),
  note: z.string().trim().max(300).optional(),
});

/**
 * Admin confirms (or rejects) a payment. Auth is enforced for everything
 * under /api/admin/* by src/middleware.ts.
 *
 *  - MARK_PAID: admin has checked the Easypaisa/JazzCash app/SMS and the
 *    money (matching transaction ID + amount) really arrived — or, for
 *    Cash on Delivery, the cash was collected.
 *  - MARK_FAILED: online payment could not be verified. Never counted as
 *    a sale. Only valid for online orders.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError('Invalid payment action.');
    const { action, note } = parsed.data;

    const order = await db.order.findUnique({ where: { id: params.id } });
    if (!order) return apiError('Order not found.', 404);

    if (['CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.status)) {
      return apiError('Payment can no longer be changed for a cancelled/rejected/refunded order.', 422);
    }
    if (order.paymentStatus === 'REFUNDED') {
      return apiError('This payment was already refunded.', 422);
    }
    if (action === 'MARK_FAILED') {
      if (order.paymentMethod !== 'ONLINE_WALLET') {
        return apiError('Only online payments can be marked as failed.', 422);
      }
      if (order.paymentStatus === 'PAID') {
        return apiError('This payment is already confirmed as paid.', 422);
      }
    }

    const updated = await db.order.update({
      where: { id: params.id },
      data:
        action === 'MARK_PAID'
          ? { paymentStatus: 'PAID', paymentVerifiedAt: new Date(), paymentNote: note || order.paymentNote }
          : { paymentStatus: 'FAILED', paymentVerifiedAt: null, paymentNote: note || 'Payment could not be verified.' },
      select: { id: true, paymentStatus: true },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id]/payment failed:', error);
    return apiError('Could not update payment.', 500);
  }
}
