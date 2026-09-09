import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getOrderForReceipt } from '@/lib/receipt';
import { getAdminOperationalSettings } from '@/lib/settings';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [order, settings] = await Promise.all([
      getOrderForReceipt(params.id),
      getAdminOperationalSettings(),
    ]);

    if (!order) return apiError('Order not found.', 404);

    return apiSuccess({ order, settings });
  } catch (error) {
    console.error('GET /api/admin/orders/[id]/receipt failed:', error);
    return apiError('Could not load receipt.', 500);
  }
}
