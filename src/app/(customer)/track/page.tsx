'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, Search, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { RECENT_ORDERS_KEY, CUSTOMER_PHONE_KEY, type RecentOrder } from '@/utils/recent-orders';
import { formatRelativeTime, formatCurrency } from '@/utils';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import {
  paymentMethodLabel,
  paymentStatusLabel,
  PAYMENT_STATUS_STYLES,
} from '@/lib/payment-labels';
import { useSettings } from '@/components/customer/SettingsProvider';
import { formatDateTimeInTimeZone } from '@/lib/format-timezone';

interface FoundOrder {
  trackingToken: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  orderType: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentProvider: string | null;
  items: { name: string; quantity: number }[];
}

const REFRESH_MS = 20000;

export default function TrackLandingPage() {
  const { currency, timezone } = useSettings();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<FoundOrder[] | null>(null);
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);
  const tokensRef = useRef<string[]>([]);
  const phoneRef = useRef<string>('');

  // Fetches the customer's ACTIVE orders using the remembered phone
  // and/or the tokens of orders placed on this device.
  const fetchOrders = useCallback(async (opts?: { phone?: string; silent?: boolean }) => {
    const usePhone = (opts?.phone ?? phoneRef.current).trim();
    const tokens = tokensRef.current;
    if (!usePhone && tokens.length === 0) {
      setOrders(null);
      return;
    }
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: usePhone || undefined, tokens: tokens.length ? tokens : undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (!opts?.silent) setError(json.error ?? 'Could not load your orders.');
        return;
      }
      setError(null);
      setOrders(json.data.orders);
    } catch {
      if (!opts?.silent) setError('Unable to connect. Please check your internet connection.');
    }
  }, []);

  // On open: automatically load whatever this device already knows
  // (phone used at checkout + recent tracking tokens) — no typing needed.
  useEffect(() => {
    let savedPhone = '';
    try {
      const raw = window.localStorage.getItem(RECENT_ORDERS_KEY);
      const recents: RecentOrder[] = raw ? JSON.parse(raw) : [];
      tokensRef.current = recents.map((r) => r.token).slice(0, 10);
      savedPhone = window.localStorage.getItem(CUSTOMER_PHONE_KEY) ?? '';
    } catch {
      tokensRef.current = [];
    }
    phoneRef.current = savedPhone;
    setPhone(savedPhone);
    fetchOrders({ silent: false }).finally(() => setIsLoading(false));
  }, [fetchOrders]);

  // Keep statuses fresh while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchOrders({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    phoneRef.current = phone.trim();
    try {
      window.localStorage.setItem(CUSTOMER_PHONE_KEY, phone.trim());
    } catch {
      /* ignore */
    }
    await fetchOrders({ phone: phone.trim() });
    setSearchedPhone(phone.trim());
    setIsSubmitting(false);
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-lg font-bold text-gray-900">Track Order</h1>
      <p className="mt-1 text-sm text-gray-500">
        Your active orders appear here automatically. You can also find them with your mobile number.
      </p>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="animate-spin text-gray-300" size={24} />
        </div>
      )}

      {!isLoading && orders && orders.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">
            {orders.length} active order{orders.length > 1 ? 's' : ''}
          </p>
          {orders.map((order) => (
            <Link
              key={order.trackingToken}
              href={`/track/${order.trackingToken}`}
              className="block rounded-2xl border border-gray-100 bg-white p-4 active:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              {order.items.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(order.totalAmount, currency)}
                </span>
                <span className="text-[11px] text-gray-400">
                  {formatDateTimeInTimeZone(order.createdAt, timezone)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed border-gray-100 pt-2">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Wallet size={12} />
                  {paymentMethodLabel(order.paymentMethod, order.paymentProvider, order.orderType)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    PAYMENT_STATUS_STYLES[order.paymentStatus] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {paymentStatusLabel(order.paymentMethod, order.paymentStatus)}
                </span>
                <span className="ml-auto text-[11px] text-gray-400">
                  {formatRelativeTime(order.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && orders && orders.length === 0 && (
        <EmptyState
          icon={<MapPin size={40} />}
          title="No active orders"
          message={
            searchedPhone
              ? 'No active orders found for that mobile number.'
              : 'Orders that are still in progress will show up here.'
          }
        />
      )}

      {!isLoading && !orders && !error && (
        <EmptyState
          icon={<MapPin size={40} />}
          title="No active order found"
          message="Enter your mobile number below to see your active orders."
        />
      )}

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Find your order</h2>
        <p className="mt-1 text-xs text-gray-500">
          Enter the mobile number you used when placing the order.
        </p>
        <form onSubmit={handleLookup} className="mt-3 space-y-3">
          <div>
            <label htmlFor="lookup-phone" className="mb-1 block text-xs font-medium text-gray-600">
              Mobile number
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
      </div>
    </div>
  );
}
