import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { deleteUploadedFileIfManaged } from '@/lib/uploads';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid update data.');
    }

    if (parsed.data.imageUrl !== undefined) {
      const existing = await db.deal.findUnique({
        where: { id: params.id },
        select: { imageUrl: true },
      });
      if (existing && existing.imageUrl !== parsed.data.imageUrl) {
        await deleteUploadedFileIfManaged(existing.imageUrl);
      }
    }

    const deal = await db.deal.update({ where: { id: params.id }, data: parsed.data });
    return apiSuccess(deal);
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Deal not found.', 404);
    console.error('PATCH /api/admin/deals/[id] failed:', error);
    return apiError('Could not update deal.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await db.deal.findUnique({
      where: { id: params.id },
      select: { imageUrl: true },
    });
    await db.deal.delete({ where: { id: params.id } });
    if (existing) await deleteUploadedFileIfManaged(existing.imageUrl);
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Deal not found.', 404);
    console.error('DELETE /api/admin/deals/[id] failed:', error);
    return apiError('Could not delete deal.', 500);
  }
}
