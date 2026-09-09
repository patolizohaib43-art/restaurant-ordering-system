import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { slugify } from '@/utils';
import { z } from 'zod';

const createSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().nullable().optional(),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  preparationTime: z.number().int().positive().nullable().optional(),
  calories: z.number().int().positive().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim();

    const products = await db.product.findMany({
      where: {
        ...(category ? { categoryId: category } : {}),
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { addons: true, orderItems: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price.toString(),
        discountPrice: p.discountPrice?.toString() ?? null,
        imageUrl: p.imageUrl,
        isAvailable: p.isAvailable,
        isFeatured: p.isFeatured,
        isPopular: p.isPopular,
        category: p.category,
        addonCount: p._count.addons,
        timesOrdered: p._count.orderItems,
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/products failed:', error);
    return apiError('Could not load products.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid product data.');
    }
    const data = parsed.data;

    if (data.discountPrice && data.discountPrice >= data.price) {
      return apiError('Sale price must be lower than the regular price.');
    }

    const category = await db.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return apiError('Selected category does not exist.', 404);

    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const product = await db.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        slug,
        description: data.description || null,
        price: data.price,
        discountPrice: data.discountPrice || null,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable ?? true,
        isFeatured: data.isFeatured ?? false,
        isPopular: data.isPopular ?? false,
        preparationTime: data.preparationTime || null,
        calories: data.calories || null,
      },
    });

    return apiSuccess(product, 201);
  } catch (error) {
    console.error('POST /api/admin/products failed:', error);
    return apiError('Could not create product.', 500);
  }
}
