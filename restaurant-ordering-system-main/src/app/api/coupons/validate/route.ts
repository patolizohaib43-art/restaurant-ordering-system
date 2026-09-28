import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { couponValidateSchema } from '@/validation/schemas';
import { Prisma } from '@prisma/client';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Throttles coupon-code guessing attempts. See src/lib/rate-limit.ts for
// the documented single-instance limitation on serverless hosts.
const COUPON_ATTEMPT_LIMIT = 30;
const COUPON_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = rateLimit(`coupon-validate:${ip}`, COUPON_ATTEMPT_LIMIT, COUPON_WINDOW_MS);
    if (!limitResult.success) {
      return apiError('Too many attempts. Please try again later.', 429);
    }

    const body = await request.json();
    const parsed = couponValidateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid request.');
    }

    const { code, subtotal } = parsed.data;
    const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    const now = new Date();

    if (!coupon) return apiError('Invalid coupon code.');
    if (!coupon.isActive) return apiError('This coupon is no longer active.');
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return apiError('This coupon has expired.');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return apiError('This coupon has reached its usage limit.');
    }
    if (coupon.minOrderAmount && new Prisma.Decimal(subtotal).lessThan(coupon.minOrderAmount)) {
      return apiError(
        `This coupon requires a minimum order of ${coupon.minOrderAmount.toString()}.`
      );
    }

    let discount =
      coupon.discountType === 'PERCENTAGE'
        ? new Prisma.Decimal(subtotal).times(coupon.discountValue).dividedBy(100)
        : coupon.discountValue;

    if (coupon.maxDiscountAmount && discount.greaterThan(coupon.maxDiscountAmount)) {
      discount = coupon.maxDiscountAmount;
    }
    if (discount.greaterThan(subtotal)) {
      discount = new Prisma.Decimal(subtotal);
    }

    return apiSuccess({
      code: coupon.code,
      discountType: coupon.discountType,
      discountAmount: discount.toDecimalPlaces(2).toString(),
    });
  } catch (error) {
    console.error('POST /api/coupons/validate failed:', error);
    return apiError('Could not validate coupon.', 500);
  }
}
