'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, ClipboardList } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency } from '@/utils';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  customerName: string;
  customerPhone: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
}

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'New' },
  { value: 'CONFIRMED', label: 'Accepted' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY', label: 'Ready' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function OrdersListClient() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setOrders(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div>
      <div className="sticky top-14 z-20 space-y-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, name, or phone..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                status === f.value
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {error && !orders && <ErrorState message="Could not load orders." onRetry={load} />}
        {!error && !orders && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-gray-300" size={28} />
          </div>
        )}
        {orders && orders.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="No orders found"
            message="Try a different search or status filter."
          />
        )}
        {orders && orders.length > 0 && (
          <div className="space-y-2.5">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-2xl border border-gray-100 bg-white p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</p>
                    <p className="truncate text-sm text-gray-600">{order.customerName}</p>
                    <p className="text-xs text-gray-400">{order.customerPhone}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} ·{' '}
                    {order.orderType === 'DELIVERY' ? 'Delivery' : order.orderType === 'PICKUP' ? 'Pickup' : 'Dine-in'}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {formatCurrency(order.totalAmount, 'PKR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
