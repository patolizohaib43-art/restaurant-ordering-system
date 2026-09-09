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
});

export async function GET() {
  try {
    const deals = await db.deal.findMany({ orderBy: { createdAt: 'desc' } });
    return apiSuccess(
      deals.map((d) => ({
        ...d,
        discountValue: d.discountValue.toString(),
        minOrderAmount: d.minOrderAmount?.toString() ?? null,
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
      },
    });

    return apiSuccess(deal, 201);
  } catch (error) {
    console.error('POST /api/admin/deals failed:', error);
    return apiError('Could not create deal.', 500);
  }
}
