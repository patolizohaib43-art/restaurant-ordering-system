import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import {
  resolveDateRange,
  buildOrderWhere,
  getProductSales,
  topProductsFrom,
  categoryPerformanceFrom,
  getCouponAnalytics,
  getDealPerformance,
  getDailySales,
  toCsv,
  type ReportFilters,
} from '@/lib/reports';
import { getRestaurantSettings } from '@/lib/settings';

/**
 * Item 18 — CSV export. Every export is recomputed from the live database
 * using the same filters as the on-screen report (never a cached/stale
 * snapshot), and never includes admin credentials or other customers'
 * private contact details beyond what's already shown in Orders.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'orders';
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

    let csv: string;
    let filename: string;

    switch (type) {
      case 'orders': {
        const orders = await db.order.findMany({
          where: buildOrderWhere(range, filters),
          orderBy: { createdAt: 'desc' },
          select: {
            orderNumber: true,
            createdAt: true,
            customerName: true,
            orderType: true,
            status: true,
            paymentMethod: true,
            subtotal: true,
            discountAmount: true,
            deliveryFee: true,
            totalAmount: true,
          },
          take: 5000,
        });
        csv = toCsv(
          ['Order #', 'Date', 'Customer', 'Type', 'Status', 'Payment', 'Subtotal', 'Discount', 'Delivery Fee', 'Total'],
          orders.map((o) => [
            o.orderNumber,
            o.createdAt.toISOString(),
            o.customerName,
            o.orderType,
            o.status,
            o.paymentMethod,
            o.subtotal.toString(),
            o.discountAmount.toString(),
            o.deliveryFee.toString(),
            o.totalAmount.toString(),
          ])
        );
        filename = `orders-report-${range.start.toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'top-products': {
        const productSales = await getProductSales(range, filters);
        const top = topProductsFrom(productSales, 100);
        csv = toCsv(
          ['Rank', 'Product', 'Category', 'Quantity Sold', 'Revenue'],
          top.map((p) => [p.rank, p.productName, p.categoryName, p.quantitySold, p.revenue])
        );
        filename = `top-products-${range.start.toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'categories': {
        const productSales = await getProductSales(range, filters);
        const categories = categoryPerformanceFrom(productSales);
        csv = toCsv(
          ['Category', 'Quantity Sold', 'Revenue'],
          categories.map((c) => [c.categoryName, c.quantitySold, c.revenue.toFixed(2)])
        );
        filename = `category-performance-${range.start.toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'coupons': {
        const coupons = await getCouponAnalytics(range);
        csv = toCsv(
          ['Coupon Code', 'Times Used', 'Discount Given', 'Orders Generated'],
          coupons.map((c) => [c.code, c.ordersGenerated, c.discountGiven, c.ordersGenerated])
        );
        filename = `coupon-analytics-${range.start.toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'deals': {
        const { deals } = await getDealPerformance(range);
        csv = toCsv(
          ['Deal', 'Times Redeemed', 'Revenue'],
          deals.map((d) => [d.title, d.dealsSold, d.revenue])
        );
        filename = `deal-performance-${range.start.toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'daily-sales': {
        const days = await getDailySales(range, timezone);
        csv = toCsv(
          ['Date', 'Total Sales', 'Orders'],
          days.map((d) => [d.date, d.total.toFixed(2), d.orders])
        );
        filename = `daily-sales-${range.start.toISOString().slice(0, 10)}.csv`;
        break;
      }
      default:
        return apiError('Unknown export type.', 400);
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/reports/export failed:', error);
    return apiError('Could not export report.', 500);
  }
}
