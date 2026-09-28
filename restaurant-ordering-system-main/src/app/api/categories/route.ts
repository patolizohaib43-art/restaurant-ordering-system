import { apiSuccess, apiError } from '@/lib/api-response';
import { getActiveCategories } from '@/lib/queries';

export async function GET() {
  try {
    const categories = await getActiveCategories();
    return apiSuccess(categories);
  } catch (error) {
    console.error('GET /api/categories failed:', error);
    return apiError('Could not load categories.', 500);
  }
}
