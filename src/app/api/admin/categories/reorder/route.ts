import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const schema = z.object({ orderedIds: z.array(z.string().min(1)).min(1) });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid reorder data.');
    }

    await db.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        db.category.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return apiSuccess({ reordered: true });
  } catch (error) {
    console.error('POST /api/admin/categories/reorder failed:', error);
    return apiError('Could not reorder categories.', 500);
  }
}
