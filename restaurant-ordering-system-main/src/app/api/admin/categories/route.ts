import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { slugify } from '@/utils';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return apiSuccess(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        productCount: c._count.products,
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/categories failed:', error);
    return apiError('Could not load categories.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid category data.');
    }

    const maxSort = await db.category.aggregate({ _max: { sortOrder: true } });
    const baseSlug = slugify(parsed.data.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await db.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const category = await db.category.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        isActive: parsed.data.isActive ?? true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return apiSuccess(category, 201);
  } catch (error) {
    console.error('POST /api/admin/categories failed:', error);
    return apiError('Could not create category.', 500);
  }
}
