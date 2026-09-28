import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, - and _'),
  description: z.string().max(300).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return apiSuccess(
      coupons.map((c) => ({
        ...c,
        discountValue: c.discountValue.toString(),
        minOrderAmount: c.minOrderAmount?.toString() ?? null,
        maxDiscountAmount: c.maxDiscountAmount?.toString() ?? null,
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/coupons failed:', error);
    return apiError('Could not load coupons.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid coupon data.');
    }
    const data = parsed.data;

    if (data.validUntil <= data.validFrom) {
      return apiError('Expiry date must be after the start date.');
    }
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return apiError('Percentage discount cannot exceed 100%.');
    }

    const code = data.code.toUpperCase();
    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) return apiError('A coupon with this code already exists.', 409);

    const coupon = await db.coupon.create({
      data: {
        code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isActive: data.isActive ?? true,
      },
    });

    return apiSuccess(coupon, 201);
  } catch (error) {
    console.error('POST /api/admin/coupons failed:', error);
    return apiError('Could not create coupon.', 500);
  }
}
