'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency } from '@/utils';
import { StatCard } from './shared';
import type { OverviewReportData } from './types';

export function OverviewTab({ currency }: { currency: string }) {
  const [data, setData] = useState<OverviewReportData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports/overview', { cache: 'no-store' });
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
  }, [load]);

  if (error && !data) return <ErrorState message="Could not load reports overview." onRetry={load} />;
  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2.5 text-sm font-bold text-gray-900">Sales at a glance</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Today's Sales" value={formatCurrency(data.todaySales, currency)} />
          <StatCard label="Yesterday's Sales" value={formatCurrency(data.yesterdaySales, currency)} />
          <StatCard label="This Week" value={formatCurrency(data.thisWeekSales, currency)} />
          <StatCard label="This Month" value={formatCurrency(data.thisMonthSales, currency)} />
        </div>
      </div>

      <div>
        <h2 className="mb-2.5 text-sm font-bold text-gray-900">Orders — all time</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Orders" value={data.totalOrders} />
          <StatCard label="Completed" value={data.completedOrders} />
          <StatCard label="Cancelled" value={data.cancelledOrders} />
          <StatCard label="Rejected" value={data.rejectedOrders} />
        </div>
        <div className="mt-3">
          <StatCard label="Average Order Value" value={formatCurrency(data.averageOrderValue, currency)} />
        </div>
      </div>

      <p className="px-1 text-center text-[11px] text-gray-400">
        For date-filtered breakdowns, open the Sales or Promotions tabs.
      </p>
    </div>
  );
}
