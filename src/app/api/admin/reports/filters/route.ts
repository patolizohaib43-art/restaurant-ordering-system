import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

/** Item 17 — lightweight lists to populate the Reports filter dropdowns. */
export async function GET() {
  try {
    const [categories, products] = await Promise.all([
      db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      db.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);
    return apiSuccess({ categories, products });
  } catch (error) {
    console.error('GET /api/admin/reports/filters failed:', error);
    return apiError('Could not load filter options.', 500);
  }
}
