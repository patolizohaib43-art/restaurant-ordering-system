import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  maxQuantity: z.number().int().positive().default(1),
  isAvailable: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const addons = await db.productAddon.findMany({
      where: { productId: params.id },
      orderBy: { name: 'asc' },
    });
    return apiSuccess(addons.map((a) => ({ ...a, price: a.price.toString() })));
  } catch (error) {
    console.error('GET /api/admin/products/[id]/addons failed:', error);
    return apiError('Could not load add-ons.', 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid add-on data.');
    }

    const product = await db.product.findUnique({ where: { id: params.id } });
    if (!product) return apiError('Product not found.', 404);

    const addon = await db.productAddon.create({
      data: { productId: params.id, ...parsed.data },
    });

    return apiSuccess({ ...addon, price: addon.price.toString() }, 201);
  } catch (error) {
    console.error('POST /api/admin/products/[id]/addons failed:', error);
    return apiError('Could not create add-on.', 500);
  }
}
