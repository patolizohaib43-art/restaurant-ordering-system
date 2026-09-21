'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { RECENT_ORDERS_KEY, type RecentOrder } from '@/utils/recent-orders';
import { formatRelativeTime, formatCurrency } from '@/utils';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';

interface FoundOrder {
  trackingToken: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  orderType: string;
  items: { name: string; quantity: number }[];
}

export default function TrackLandingPage() {
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundOrders, setFoundOrders] = useState<FoundOrder[] | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_ORDERS_KEY);
      setRecentOrders(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentOrders([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setFoundOrders(null);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'No active orders found for that phone number.');
        return;
      }
      setFoundOrders(json.data.orders);
    } catch {
      setError('Unable to connect. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-lg font-bold text-gray-900">Track Order</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pick a recent order below, or enter your phone number to find your active orders.
      </p>

      {isHydrated && recentOrders.length > 0 && (
        <div className="mt-4 space-y-2">
          {recentOrders.map((order) => (
            <Link
              key={order.token}
              href={`/track/${order.token}`}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5 active:bg-gray-50"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <MapPin size={18} />
                </span>
                <span>
                  <span className="block font-mono text-sm font-semibold text-gray-900">
                    {order.orderNumber}
                  </span>
                  <span className="block text-xs text-gray-400">
                    Saved {formatRelativeTime(new Date(order.savedAt).toISOString())}
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {isHydrated && recentOrders.length === 0 && (
        <EmptyState
          icon={<MapPin size={40} />}
          title="No active order found"
          message="Orders you place on this device will show up here automatically."
        />
      )}

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Find your order</h2>
        <p className="mt-1 text-xs text-gray-500">
          Enter the SAME phone number you used when placing the order.
        </p>
        <form onSubmit={handleLookup} className="mt-3 space-y-3">
          <div>
            <label htmlFor="lookup-phone" className="mb-1 block text-xs font-medium text-gray-600">
              Phone number
            </label>
            <input
              id="lookup-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03001234567"
              className="h-12 w-full rounded-xl border border-gray-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!phone.trim() || isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:bg-gray-300"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={18} aria-hidden="true" />
            )}
            Track Order
          </button>
        </form>

        {foundOrders && (
          <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500">
              {foundOrders.length} active order{foundOrders.length > 1 ? 's' : ''} found
            </p>
            {foundOrders.map((order) => (
              <Link
                key={order.trackingToken}
                href={`/track/${order.trackingToken}`}
                className="block rounded-xl border border-gray-100 px-3.5 py-3 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {order.orderNumber}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatCurrency(order.totalAmount, 'PKR')}
                  </span>
                </div>
                {order.items.length > 0 && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(order.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
