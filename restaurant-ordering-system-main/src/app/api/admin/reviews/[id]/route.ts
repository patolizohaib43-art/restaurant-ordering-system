import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const schema = z.object({ isApproved: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError('Invalid request.');

    const review = await db.review.update({
      where: { id: params.id },
      data: { isApproved: parsed.data.isApproved },
    });
    return apiSuccess(review);
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Review not found.', 404);
    console.error('PATCH /api/admin/reviews/[id] failed:', error);
    return apiError('Could not update review.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.review.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Review not found.', 404);
    console.error('DELETE /api/admin/reviews/[id] failed:', error);
    return apiError('Could not delete review.', 500);
  }
}
