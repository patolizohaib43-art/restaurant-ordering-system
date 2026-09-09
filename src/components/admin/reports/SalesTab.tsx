'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, cn } from '@/utils';
import { ReportFilterBar } from './ReportFilterBar';
import { DailySalesChart } from './DailySalesChart';
import { StatusDistributionChart } from './StatusDistributionChart';
import { StatCard, ExportButton } from './shared';
import { DEFAULT_FILTERS, filtersToQuery, type ReportFilterState, type SalesReportData } from './types';

export function SalesTab({ currency }: { currency: string }) {
  const [filters, setFilters] = useState<ReportFilterState>(DEFAULT_FILTERS);
  const [data, setData] = useState<SalesReportData | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const query = filtersToQuery(filters);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/sales?${q}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setData(json.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const maxCategoryRevenue = data ? Math.max(...data.categoryPerformance.map((c) => c.revenue), 1) : 1;

  return (
    <div className="space-y-5">
      <ReportFilterBar filters={filters} onChange={setFilters} />

      {error && !data && <ErrorState message="Could not load the sales report." onRetry={() => load(query)} />}

      {!data && !error && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      )}

      {data && (
        <div className={cn('space-y-5', isLoading && 'opacity-60')}>
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Sales — {data.range.label}</h2>
              <ExportButton
                url={`/api/admin/reports/export?type=orders&${query}`}
                filename={`orders-report.csv`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Sales" value={formatCurrency(data.totals.totalSales, currency)} />
              <StatCard label="Orders" value={data.totals.orderCount} />
              <StatCard label="Avg. Order Value" value={formatCurrency(data.totals.averageOrderValue, currency)} />
              <StatCard label="Discount Given" value={formatCurrency(data.totals.discountGiven, currency)} />
              <StatCard label="Delivery Charges" value={formatCurrency(data.totals.deliveryCharges, currency)} />
              <StatCard
                label="Completed / Cancelled"
                value={`${data.totals.completedOrders} / ${data.totals.cancelledOrders}`}
              />
            </div>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Daily sales</h2>
              <ExportButton
                url={`/api/admin/reports/export?type=daily-sales&${query}`}
                filename="daily-sales.csv"
              />
            </div>
            <DailySalesChart data={data.dailySales} currency={currency} />
          </div>

          <div>
            <h2 className="mb-2.5 text-sm font-bold text-gray-900">Order status breakdown</h2>
            <StatusDistributionChart data={data.statusDistribution} />
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Top products</h2>
              <ExportButton
                url={`/api/admin/reports/export?type=top-products&${query}`}
                filename="top-products.csv"
              />
            </div>
            {data.topProducts.length === 0 ? (
              <EmptyState title="No sales yet" message="Top products will appear once orders come in." />
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p) => (
                  <div
                    key={p.productId ?? p.rank}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5"
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        p.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {p.rank <= 3 ? <Trophy size={14} /> : p.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{p.productName}</p>
                      <p className="text-xs text-gray-400">{p.categoryName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{p.quantitySold} sold</p>
                      <p className="text-xs text-gray-400">{formatCurrency(p.revenue, currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Category performance</h2>
              <ExportButton
                url={`/api/admin/reports/export?type=categories&${query}`}
                filename="category-performance.csv"
              />
            </div>
            {data.categoryPerformance.length === 0 ? (
              <EmptyState title="No sales yet" message="Category performance will appear once orders come in." />
            ) : (
              <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4">
                {data.categoryPerformance.map((c) => (
                  <div key={c.categoryId ?? c.categoryName}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{c.categoryName}</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(c.revenue, currency)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.max((c.revenue / maxCategoryRevenue) * 100, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
