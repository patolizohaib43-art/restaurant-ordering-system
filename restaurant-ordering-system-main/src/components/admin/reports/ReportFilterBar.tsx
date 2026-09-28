'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';
import { DEFAULT_FILTERS, STATUS_OPTIONS, type ReportFilterState } from './types';

const RANGE_OPTIONS: { key: ReportFilterState['range']; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

interface FilterOption {
  id: string;
  name: string;
}

export function ReportFilterBar({
  filters,
  onChange,
}: {
  filters: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [products, setProducts] = useState<FilterOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/reports/filters', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCategories(json.data.categories);
          setProducts(json.data.products);
        }
      })
      .catch(() => {});
  }, []);

  const activeExtraFilters = [
    filters.status,
    filters.paymentMethod,
    filters.orderType,
    filters.categoryId,
    filters.productId,
  ].filter(Boolean).length;

  return (
    <div>
      {/* Date range chips — horizontally scrollable on narrow screens */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange({ ...filters, range: opt.key })}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold',
              filters.range === opt.key
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-200 bg-white text-gray-600'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filters.range === 'custom' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMore((s) => !s)}
        className="mt-2.5 flex h-10 items-center gap-1.5 text-xs font-semibold text-gray-600"
      >
        <SlidersHorizontal size={14} />
        Filters
        {activeExtraFilters > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] text-white">
            {activeExtraFilters}
          </span>
        )}
        <ChevronDown size={14} className={cn('transition-transform', showMore && 'rotate-180')} />
      </button>

      {showMore && (
        <div className="mt-1 grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-white p-3">
          <Select
            label="Status"
            value={filters.status}
            onChange={(v) => onChange({ ...filters, status: v })}
            options={[['', 'Any status'], ...STATUS_OPTIONS]}
          />
          <Select
            label="Order type"
            value={filters.orderType}
            onChange={(v) => onChange({ ...filters, orderType: v })}
            options={[
              ['', 'Any type'],
              ['DELIVERY', 'Delivery'],
              ['PICKUP', 'Pickup'],
              ['DINE_IN', 'Dine-in'],
            ]}
          />
          <Select
            label="Payment"
            value={filters.paymentMethod}
            onChange={(v) => onChange({ ...filters, paymentMethod: v })}
            options={[
              ['', 'Any method'],
              ['CASH_ON_DELIVERY', 'Cash'],
              ['CARD', 'Card'],
              ['ONLINE_WALLET', 'Wallet'],
            ]}
          />
          <Select
            label="Category"
            value={filters.categoryId}
            onChange={(v) => onChange({ ...filters, categoryId: v })}
            options={[['', 'Any category'], ...categories.map((c) => [c.id, c.name] as const)]}
          />
          <div className="col-span-2">
            <Select
              label="Product"
              value={filters.productId}
              onChange={(v) => onChange({ ...filters, productId: v })}
              options={[['', 'Any product'], ...products.map((p) => [p.id, p.name] as const)]}
            />
          </div>
          {activeExtraFilters > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  status: '',
                  paymentMethod: '',
                  orderType: '',
                  categoryId: '',
                  productId: '',
                })
              }
              className="col-span-2 mt-1 h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export { DEFAULT_FILTERS };
