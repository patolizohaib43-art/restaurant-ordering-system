import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/** Public list of active delivery areas, for the checkout area selector. */
export async function GET() {
  try {
    const areas = await db.deliveryArea.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, deliveryFee: true, minOrderAmount: true },
    });
    return apiSuccess(
      areas.map((a) => ({
        id: a.id,
        name: a.name,
        deliveryFee: a.deliveryFee.toString(),
        minOrderAmount: a.minOrderAmount?.toString() ?? null,
      }))
    );
  } catch (error) {
    console.error('GET /api/delivery-areas failed:', error);
    return apiError('Could not load delivery areas.', 500);
  }
}
