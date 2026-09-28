import { apiSuccess, apiError } from '@/lib/api-response';
import { getOrderByTrackingToken } from '@/lib/queries';

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    const order = await getOrderByTrackingToken(params.token);
    if (!order) {
      return apiError('Order not found. Please check your tracking link.', 404);
    }
    return apiSuccess(order);
  } catch (error) {
    console.error('GET /api/orders/track/[token] failed:', error);
    return apiError('Could not load order.', 500);
  }
}
