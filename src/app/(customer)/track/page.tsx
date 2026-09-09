'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MapPin, Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { RECENT_ORDERS_KEY, type RecentOrder } from '@/utils/recent-orders';
import { formatRelativeTime } from '@/utils';

export default function TrackLandingPage() {
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!orderNumber.trim() || !phone.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Order not found or tracking link is invalid.');
        return;
      }
      router.push(`/track/${json.data.trackingToken}`);
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
        Pick a recent order below, or look one up with your order number and phone.
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
        <h2 className="text-sm font-semibold text-gray-900">Find an order</h2>
        <p className="mt-1 text-xs text-gray-500">
          Lost your tracking link? Enter the order number and the phone number used.
        </p>
        <form onSubmit={handleLookup} className="mt-3 space-y-3">
          <div>
            <label htmlFor="lookup-order-number" className="mb-1 block text-xs font-medium text-gray-600">
              Order number
            </label>
            <input
              id="lookup-order-number"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ORD-20260907-0001"
              className="h-12 w-full rounded-xl border border-gray-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
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
              placeholder="03xx-xxxxxxx"
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
            disabled={!orderNumber.trim() || !phone.trim() || isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:bg-gray-300"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={18} aria-hidden="true" />
            )}
            Find my order
          </button>
        </form>
      </div>
    </div>
  );
}
