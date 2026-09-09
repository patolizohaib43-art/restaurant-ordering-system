import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const updateSchema = z.object({
  description: z.string().max(300).nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid update data.');
    }

    const coupon = await db.coupon.update({ where: { id: params.id }, data: parsed.data });
    return apiSuccess(coupon);
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Coupon not found.', 404);
    console.error('PATCH /api/admin/coupons/[id] failed:', error);
    return apiError('Could not update coupon.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.coupon.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Coupon not found.', 404);
    console.error('DELETE /api/admin/coupons/[id] failed:', error);
    return apiError('Could not delete coupon.', 500);
  }
}
