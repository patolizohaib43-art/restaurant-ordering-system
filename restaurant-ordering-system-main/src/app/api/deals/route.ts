import { apiSuccess, apiError } from '@/lib/api-response';
import { getActiveDeals } from '@/lib/queries';

export async function GET() {
  try {
    const deals = await getActiveDeals(20);
    return apiSuccess(deals);
  } catch (error) {
    console.error('GET /api/deals failed:', error);
    return apiError('Could not load deals.', 500);
  }
}
