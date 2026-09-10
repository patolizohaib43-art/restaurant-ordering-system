import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { deleteUploadedFileIfManaged } from '@/lib/uploads';
import { z } from 'zod';

const updateSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().positive().optional(),
  discountPrice: z.number().positive().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  preparationTime: z.number().int().positive().nullable().optional(),
  calories: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: { category: true, addons: { orderBy: { name: 'asc' } } },
    });
    if (!product) return apiError('Product not found.', 404);

    return apiSuccess({
      ...product,
      price: product.price.toString(),
      discountPrice: product.discountPrice?.toString() ?? null,
      addons: product.addons.map((a: any) => ({ ...a, price: a.price.toString() })),
    });
  } catch (error) {
    console.error('GET /api/admin/products/[id] failed:', error);
    return apiError('Could not load product.', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid update data.');
    }
    const data = parsed.data;

    if (data.discountPrice && data.price && data.discountPrice >= data.price) {
      return apiError('Sale price must be lower than the regular price.');
    }

    // If the image is being changed or cleared, delete the old file we
    // were managing (no-op for external URLs or if it's unchanged).
    if (data.imageUrl !== undefined) {
      const existing = await db.product.findUnique({
        where: { id: params.id },
        select: { imageUrl: true },
      });
      if (existing && existing.imageUrl !== data.imageUrl) {
        await deleteUploadedFileIfManaged(existing.imageUrl);
      }
    }

    const product = await db.product.update({ where: { id: params.id }, data });
    return apiSuccess(product);
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Product not found.', 404);
    console.error('PATCH /api/admin/products/[id] failed:', error);
    return apiError('Could not update product.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await db.product.findUnique({
      where: { id: params.id },
      select: { imageUrl: true },
    });
    await db.product.delete({ where: { id: params.id } });
    if (existing) await deleteUploadedFileIfManaged(existing.imageUrl);
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return apiError('Product not found.', 404);
    console.error('DELETE /api/admin/products/[id] failed:', error);
    return apiError('Could not delete product.', 500);
  }
}
