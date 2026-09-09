import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { resolveDateRange, getCouponAnalytics, getDealPerformance } from '@/lib/reports';

/** Items 14 & 15 — Deal Performance and Coupon Analytics. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = resolveDateRange(
      searchParams.get('range'),
      searchParams.get('from'),
      searchParams.get('to')
    );

    const [coupons, deals] = await Promise.all([getCouponAnalytics(range), getDealPerformance(range)]);

    return apiSuccess({
      range: { start: range.start.toISOString(), end: range.end.toISOString(), label: range.label },
      coupons,
      deals,
    });
  } catch (error) {
    console.error('GET /api/admin/reports/promotions failed:', error);
    return apiError('Could not load promotions report.', 500);
  }
}
