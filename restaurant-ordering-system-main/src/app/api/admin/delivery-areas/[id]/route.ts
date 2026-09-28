import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { deliveryAreaSchema } from '@/validation/schemas';

const updateSchema = deliveryAreaSchema.partial();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid delivery area data.');
    }

    const area = await db.deliveryArea.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return apiSuccess(area);
  } catch (error) {
    console.error('PATCH /api/admin/delivery-areas/[id] failed:', error);
    return apiError('Could not update delivery area.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Orders that used this area keep their historical deliveryAreaId
    // reference nulled out (onDelete: SetNull in schema) — their already
    // charged deliveryFee is untouched either way.
    await db.deliveryArea.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/admin/delivery-areas/[id] failed:', error);
    return apiError('Could not delete delivery area.', 500);
  }
}
