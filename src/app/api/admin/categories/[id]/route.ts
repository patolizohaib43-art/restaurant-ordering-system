import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid update data.');
    }

    const category = await db.category.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return apiSuccess(category);
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Category not found.', 404);
    console.error('PATCH /api/admin/categories/[id] failed:', error);
    return apiError('Could not update category.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.category.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Category not found.', 404);
    if (error?.code === 'P2003' || error?.code === 'P2014') {
      return apiError(
        'This category still has products in it. Move or delete those products first.',
        409
      );
    }
    console.error('DELETE /api/admin/categories/[id] failed:', error);
    return apiError('Could not delete category.', 500);
  }
}
