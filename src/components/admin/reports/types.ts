export interface ReportFilterState {
  range: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';
  from: string;
  to: string;
  status: string;
  paymentMethod: string;
  orderType: string;
  categoryId: string;
  productId: string;
}

export const DEFAULT_FILTERS: ReportFilterState = {
  range: 'last7',
  from: '',
  to: '',
  status: '',
  paymentMethod: '',
  orderType: '',
  categoryId: '',
  productId: '',
};

export function filtersToQuery(filters: ReportFilterState): string {
  const params = new URLSearchParams();
  params.set('range', filters.range);
  if (filters.range === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
  if (filters.orderType) params.set('orderType', filters.orderType);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.productId) params.set('productId', filters.productId);
  return params.toString();
}

export interface SalesTotals {
  totalSales: string;
  orderCount: number;
  averageOrderValue: string;
  discountGiven: string;
  deliveryCharges: string;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TopProduct {
  rank: number;
  productId: string | null;
  productName: string;
  categoryName: string;
  quantitySold: number;
  revenue: string;
}

export interface CategoryPerformance {
  categoryId: string | null;
  categoryName: string;
  revenue: number;
  quantitySold: number;
}

export interface DailySalesPoint {
  date: string;
  total: number;
  orders: number;
}

export interface SalesReportData {
  range: { start: string; end: string; label: string };
  totals: SalesTotals;
  statusDistribution: StatusCount[];
  topProducts: TopProduct[];
  categoryPerformance: CategoryPerformance[];
  dailySales: DailySalesPoint[];
}

export interface CouponAnalytic {
  couponId: string | null;
  code: string;
  ordersGenerated: number;
  discountGiven: string;
}

export interface DealAnalytic {
  dealId: string | null;
  title: string;
  dealsSold: number;
  revenue: string;
}

export interface PromotionsReportData {
  range: { start: string; end: string; label: string };
  coupons: CouponAnalytic[];
  deals: { deals: DealAnalytic[]; mostPopularDeal: string | null; totalDealsSold: number; totalDealRevenue: string };
}

export interface OverviewReportData {
  todaySales: string;
  yesterdaySales: string;
  thisWeekSales: string;
  thisMonthSales: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  averageOrderValue: string;
}

export const STATUS_OPTIONS = [
  ['PENDING', 'Pending'],
  ['CONFIRMED', 'Accepted'],
  ['PREPARING', 'Preparing'],
  ['READY', 'Ready'],
  ['OUT_FOR_DELIVERY', 'Out for Delivery'],
  ['DELIVERED', 'Delivered'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
  ['REJECTED', 'Rejected'],
  ['REFUNDED', 'Refunded'],
] as const;
