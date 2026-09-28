import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getOrderForReceipt } from '@/lib/receipt';
import { getAdminOperationalSettings } from '@/lib/settings';
import { getRestaurantTimeZone } from '@/lib/timezone';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [order, settings] = await Promise.all([
      getOrderForReceipt(params.id),
      getAdminOperationalSettings(),
    ]);

    if (!order) return apiError('Order not found.', 404);

    // Resolve to a concrete, always-valid IANA name here (server-side,
    // where the RESTAURANT_TIMEZONE env fallback is actually available)
    // rather than letting the client guess — the receipt must reflect
    // the restaurant's configured timezone, never the printing device's.
    const resolvedSettings = { ...settings, timezone: getRestaurantTimeZone(settings.timezone) };

    return apiSuccess({ order, settings: resolvedSettings });
  } catch (error) {
    console.error('GET /api/admin/orders/[id]/receipt failed:', error);
    return apiError('Could not load receipt.', 500);
  }
}
