import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  resolveDateRange,
  getSalesTotals,
  getOrderStatusDistribution,
  getProductSales,
  topProductsFrom,
  categoryPerformanceFrom,
  getDailySales,
  type ReportFilters,
} from '@/lib/reports';
import { getRestaurantSettings } from '@/lib/settings';

/**
 * Items 10, 11, 12, 13, 16 & 17 — the main Sales Report. All sections share
 * one resolved date range + filter set and are computed with a single
 * round of server-side aggregation (Promise.all), so switching a filter on
 * the mobile Reports screen costs exactly one request.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { timezone } = await getRestaurantSettings();
    const range = resolveDateRange(
      searchParams.get('range'),
      searchParams.get('from'),
      searchParams.get('to'),
      timezone
    );

    const filters: ReportFilters = {
      status: searchParams.get('status'),
      paymentMethod: searchParams.get('paymentMethod'),
      orderType: searchParams.get('orderType'),
      categoryId: searchParams.get('categoryId'),
      productId: searchParams.get('productId'),
    };

    // Daily sales trend only makes sense for spans longer than a single day,
    // and is capped to avoid rendering an unreadable chart for huge ranges.
    const spanDays = Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1;

    const [totals, statusDistribution, productSales, dailySales] = await Promise.all([
      getSalesTotals(range, filters),
      getOrderStatusDistribution(range, filters),
      getProductSales(range, filters),
      spanDays <= 92 ? getDailySales(range, timezone) : Promise.resolve([]),
    ]);

    return apiSuccess({
      range: { start: range.start.toISOString(), end: range.end.toISOString(), label: range.label },
      totals,
      statusDistribution,
      topProducts: topProductsFrom(productSales, 10),
      categoryPerformance: categoryPerformanceFrom(productSales),
      dailySales,
    });
  } catch (error) {
    console.error('GET /api/admin/reports/sales failed:', error);
    return apiError('Could not load sales report.', 500);
  }
}
