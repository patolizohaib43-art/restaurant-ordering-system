import { apiSuccess, apiError } from '@/lib/api-response';
import { getPublicSettings } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getPublicSettings();
    return apiSuccess(settings);
  } catch (error) {
    console.error('GET /api/settings failed:', error);
    return apiError('Could not load restaurant settings.', 500);
  }
}
