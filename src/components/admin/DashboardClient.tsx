'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  Loader2,
  Star,
} from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { StarRatingDisplay } from '@/components/customer/StarRating';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency } from '@/utils';

interface DashboardData {
  ordersToday: number;
  pendingCount: number;
  preparingCount: number;
  completedCount: number;
  cancelledCount: number;
  todaySales: string;
  totalSales: string;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    totalAmount: string;
    createdAt: string;
  }[];
  recentReviews: {
    id: string;
    productName: string;
    customerName: string;
    rating: number;
    comment: string | null;
    isApproved: boolean;
    createdAt: string;
  }[];
}

const REFRESH_MS = 30000;

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setData(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (error && !data) {
    return <ErrorState message="Could not load dashboard data." onRetry={load} />;
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  const stats = [
    { label: "Today's Orders", value: data.ordersToday, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: data.pendingCount, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Preparing', value: data.preparingCount, icon: ChefHat, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Completed', value: data.completedCount, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { label: 'Cancelled', value: data.cancelledCount, icon: XCircle, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="px-4 py-4">
      <Link
        href="/admin/reports"
        className="mb-3 flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3.5"
      >
        <span className="text-sm font-semibold text-brand-700">View full sales &amp; reports</span>
        <TrendingUp size={16} className="text-brand-600" />
      </Link>

      {/* Sales summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Wallet size={16} />
            <span className="text-xs font-medium">Today&apos;s Sales</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-gray-900">
            {formatCurrency(data.todaySales, 'PKR')}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Total Sales</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-gray-900">
            {formatCurrency(data.totalSales, 'PKR')}
          </p>
        </div>
      </div>

      {/* Order status stats */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-brand-600">
            See all
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-400">
            No orders yet.
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</p>
                  <p className="truncate text-xs text-gray-500">{order.customerName}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={order.status} />
                  <span className="text-xs font-semibold text-gray-700">
                    {formatCurrency(order.totalAmount, 'PKR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Recent Reviews</h2>
          <Link href="/admin/reviews" className="text-xs font-semibold text-brand-600">
            Moderate
          </Link>
        </div>
        {data.recentReviews.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-400">
            No reviews yet.
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentReviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{review.productName}</span>
                  <StarRatingDisplay rating={review.rating} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{review.customerName}</p>
                {review.comment && (
                  <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                )}
                {!review.isApproved && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <Star size={10} /> Awaiting approval
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
