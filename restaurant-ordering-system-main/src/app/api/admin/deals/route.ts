import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const dealSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  imageUrl: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional(),
  // Phase 12: bundle deals. Both optional — omit to keep a deal as a
  // plain order-level discount, exactly as before.
  bundlePrice: z.number().positive().nullable().optional(),
  dealItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(20),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const deals = await db.deal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { dealItems: { include: { product: { select: { name: true } } } } },
    });
    return apiSuccess(
      deals.map((d) => ({
        ...d,
        discountValue: d.discountValue.toString(),
        minOrderAmount: d.minOrderAmount?.toString() ?? null,
        bundlePrice: d.bundlePrice?.toString() ?? null,
        dealItems: d.dealItems.map((di) => ({
          id: di.id,
          productId: di.productId,
          productName: di.product.name,
          quantity: di.quantity,
        })),
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/deals failed:', error);
    return apiError('Could not load deals.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = dealSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid deal data.');
    }
    const data = parsed.data;

    if (data.endDate <= data.startDate) {
      return apiError('End date must be after the start date.');
    }
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return apiError('Percentage discount cannot exceed 100%.');
    }
    if (data.dealItems && data.dealItems.length > 0 && !data.bundlePrice) {
      return apiError('Set a bundle price for the selected items.');
    }

    const deal = await db.deal.create({
      data: {
        title: data.title,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? true,
        bundlePrice: data.bundlePrice ?? null,
        ...(data.dealItems &&
          data.dealItems.length > 0 && {
            dealItems: {
              create: data.dealItems.map((di) => ({ productId: di.productId, quantity: di.quantity })),
            },
          }),
      },
    });

    return apiSuccess(deal, 201);
  } catch (error) {
    console.error('POST /api/admin/deals failed:', error);
    return apiError('Could not create deal.', 500);
  }
}
