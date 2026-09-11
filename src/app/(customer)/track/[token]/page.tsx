'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { RefreshCw, Loader2, Star, Clock } from 'lucide-react';
import { OrderStatusTimeline } from '@/components/customer/OrderStatusTimeline';
import { NotificationPrompt } from '@/components/customer/NotificationPrompt';
import { ErrorState } from '@/components/shared/ErrorState';
import { useSettings } from '@/components/customer/SettingsProvider';
import { formatCurrency } from '@/utils';
import { formatDateTimeInTimeZone, formatTimeInTimeZone } from '@/lib/format-timezone';
import type { OrderDetailView } from '@/lib/queries';

const POLL_INTERVAL_MS = 15000;

// Polling should stop once an order reaches a terminal state — there is
// nothing more to fetch, and continuing would just waste the customer's
// mobile data/battery.
const TERMINAL_STATUSES = new Set(['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED']);

const STATUS_HEADLINES: Record<string, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Order accepted',
  PREPARING: 'Preparing your order',
  READY: 'Order ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  REJECTED: 'Order rejected',
  CANCELLED: 'Order cancelled',
};

const STATUS_NOTIFICATION_MESSAGES: Record<string, string> = {
  CONFIRMED: 'Your order has been accepted by the restaurant.',
  PREPARING: 'Your order is being prepared.',
  READY: 'Your order is ready.',
  OUT_FOR_DELIVERY: 'Your order is out for delivery.',
  DELIVERED: 'Your order has been delivered. Enjoy!',
};

export default function TrackOrderPage({ params }: { params: { token: string } }) {
  const { currency, timezone } = useSettings();
  const [order, setOrder] = useState<OrderDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/track/${params.token}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Order not found.');
        return;
      }
      const nextOrder: OrderDetailView = json.data;

      // Fire a browser notification only on an actual status change
      // after the first load — never on initial page load, and never
      // if the customer hasn't granted permission.
      if (
        previousStatus.current !== null &&
        previousStatus.current !== nextOrder.status &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const body = STATUS_NOTIFICATION_MESSAGES[nextOrder.status];
        if (body) {
          new Notification(`Order ${nextOrder.orderNumber}`, { body });
        }
      }
      previousStatus.current = nextOrder.status;

      setOrder(nextOrder);
      setError(null);
    } catch {
      setError('Could not load order status. Check your connection.');
    }
  }, [params.token]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const startPoll = () => {
      clearPoll();
      // Never poll while the tab/app isn't visible, and never poll once
      // the order is in a terminal state — both waste the customer's
      // mobile data and battery for no benefit.
      if (document.visibilityState !== 'visible') return;
      if (previousStatus.current && TERMINAL_STATUSES.has(previousStatus.current)) return;
      interval = setInterval(() => {
        if (previousStatus.current && TERMINAL_STATUSES.has(previousStatus.current)) {
          clearPoll();
          return;
        }
        load();
      }, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Coming back into view: refresh immediately, then resume polling.
        load();
        startPoll();
      } else {
        clearPoll();
      }
    };

    load();
    startPoll();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearPoll();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [load]);

  async function handleManualRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  if (error) {
    return <ErrorState title="Order not found" message={error} onRetry={load} />;
  }

  if (!order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  const canReview =
    (order.status === 'DELIVERED' || order.status === 'COMPLETED') &&
    order.items.some((i: any) => i.productId && !order.reviewedProductIds.includes(i.productId));

  const lastUpdatedAt =
    order.statusHistory.length > 0
      ? order.statusHistory[order.statusHistory.length - 1].createdAt
      : order.createdAt;

  const isNegativeStatus = order.status === 'REJECTED' || order.status === 'CANCELLED';

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Order</p>
          <p className="font-mono text-base font-bold text-gray-900">{order.orderNumber}</p>
        </div>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 active:bg-gray-50"
          aria-label="Refresh status"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <NotificationPrompt trackingToken={params.token} />

      <div
        className={`mt-4 rounded-2xl border p-4 ${
          isNegativeStatus ? 'border-red-200 bg-red-50' : 'border-brand-100 bg-brand-50'
        }`}
      >
        <p
          className={`text-lg font-bold ${isNegativeStatus ? 'text-red-800' : 'text-brand-900'}`}
        >
          {STATUS_HEADLINES[order.status] ?? order.status}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Updated {formatDateTimeInTimeZone(lastUpdatedAt, timezone)}
          </span>
          {order.estimatedDeliveryTime && !isNegativeStatus && (
            <span>
              Estimated{' '}
              {order.orderType === 'DELIVERY' ? 'delivery' : 'pickup'} by{' '}
              {formatTimeInTimeZone(order.estimatedDeliveryTime, timezone)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5">
        <OrderStatusTimeline
          currentStatus={order.status}
          orderType={order.orderType}
          history={order.statusHistory}
          timeZone={timezone}
        />
      </div>

      {canReview && (
        <Link
          href={`/review/${params.token}`}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-bold text-amber-950 active:bg-amber-500"
        >
          <Star size={18} /> Rate your order
        </Link>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Order details</h2>
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-800">
                  {item.quantity}× {item.productName}
                </p>
                {item.addons.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {item.addons.map((a: any) => a.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-medium text-gray-700">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-200 pt-3">
            <div className="flex justify-between text-sm font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {order.deliveryAddress && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Delivering to</h2>
          <p className="text-sm text-gray-600">
            {order.deliveryAddress}
            {order.area ? `, ${order.area}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
