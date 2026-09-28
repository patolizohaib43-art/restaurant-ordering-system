import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  maxQuantity: z.number().int().positive().optional(),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid update data.');
    }

    const addon = await db.productAddon.update({ where: { id: params.id }, data: parsed.data });
    return apiSuccess({ ...addon, price: addon.price.toString() });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Add-on not found.', 404);
    console.error('PATCH /api/admin/addons/[id] failed:', error);
    return apiError('Could not update add-on.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.productAddon.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Add-on not found.', 404);
    console.error('DELETE /api/admin/addons/[id] failed:', error);
    return apiError('Could not delete add-on.', 500);
  }
}
