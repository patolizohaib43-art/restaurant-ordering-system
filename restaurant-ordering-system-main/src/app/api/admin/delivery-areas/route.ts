import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { deliveryAreaSchema } from '@/validation/schemas';

/** Phase 10 — admin-managed delivery zones with per-area pricing. */
export async function GET() {
  try {
    const areas = await db.deliveryArea.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return apiSuccess(areas);
  } catch (error) {
    console.error('GET /api/admin/delivery-areas failed:', error);
    return apiError('Could not load delivery areas.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deliveryAreaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid delivery area data.');
    }

    const maxSort = await db.deliveryArea.aggregate({ _max: { sortOrder: true } });
    const area = await db.deliveryArea.create({
      data: {
        name: parsed.data.name,
        deliveryFee: parsed.data.deliveryFee,
        minOrderAmount: parsed.data.minOrderAmount ?? null,
        isActive: parsed.data.isActive ?? true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return apiSuccess(area, 201);
  } catch (error) {
    console.error('POST /api/admin/delivery-areas failed:', error);
    return apiError('Could not create delivery area.', 500);
  }
}
