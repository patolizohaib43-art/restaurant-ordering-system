'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Ticket, Sparkles, Crown } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, cn } from '@/utils';
import { ReportFilterBar } from './ReportFilterBar';
import { StatCard, ExportButton } from './shared';
import { DEFAULT_FILTERS, filtersToQuery, type ReportFilterState, type PromotionsReportData } from './types';

export function PromotionsTab({ currency }: { currency: string }) {
  // Promotions only ever filter by date range — item/status filters don't
  // apply to coupon/deal usage, so we reuse the same bar but the API
  // ignores the extra fields.
  const [filters, setFilters] = useState<ReportFilterState>(DEFAULT_FILTERS);
  const [data, setData] = useState<PromotionsReportData | null>(null);
  const [error, setError] = useState(false);

  const query = filtersToQuery(filters);

  const load = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/admin/reports/promotions?${q}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setData(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['today', 'last7', 'last30', 'thisMonth'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilters({ ...filters, range: key })}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold',
              filters.range === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-600'
            )}
          >
            {{ today: 'Today', last7: 'Last 7 days', last30: 'Last 30 days', thisMonth: 'This month' }[key]}
          </button>
        ))}
      </div>

      {error && !data && <ErrorState message="Could not load promotions report." onRetry={() => load(query)} />}

      {!data && !error && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      )}

      {data && (
        <>
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Sparkles size={15} className="text-brand-600" /> Deal performance
              </h2>
              <ExportButton url={`/api/admin/reports/export?type=deals&${query}`} filename="deal-performance.csv" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Deals Sold" value={data.deals.totalDealsSold} />
              <StatCard label="Revenue from Deals" value={formatCurrency(data.deals.totalDealRevenue, currency)} />
            </div>
            {data.deals.mostPopularDeal && (
              <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
                <Crown size={16} className="shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Most popular: <strong>{data.deals.mostPopularDeal}</strong>
                </p>
              </div>
            )}
            {data.deals.deals.length === 0 ? (
              <div className="mt-2.5">
                <EmptyState
                  title="No deals redeemed yet"
                  message="Deal redemptions in this range will show up here once customers apply a deal at checkout."
                />
              </div>
            ) : (
              <div className="mt-2.5 space-y-2">
                {data.deals.deals.map((d) => (
                  <div
                    key={d.dealId ?? d.title}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-gray-800">{d.title}</span>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{d.dealsSold} used</p>
                      <p className="text-xs text-gray-400">{formatCurrency(d.revenue, currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Ticket size={15} className="text-brand-600" /> Coupon analytics
              </h2>
              <ExportButton url={`/api/admin/reports/export?type=coupons&${query}`} filename="coupon-analytics.csv" />
            </div>
            {data.coupons.length === 0 ? (
              <EmptyState title="No coupons used yet" message="Coupon usage in this range will show up here." />
            ) : (
              <div className="space-y-2">
                {data.coupons.map((c) => (
                  <div
                    key={c.couponId ?? c.code}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5"
                  >
                    <span className="font-mono text-sm font-bold text-gray-900">{c.code}</span>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-800">Used {c.ordersGenerated}×</p>
                      <p className="text-xs text-gray-400">{formatCurrency(c.discountGiven, currency)} given</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
