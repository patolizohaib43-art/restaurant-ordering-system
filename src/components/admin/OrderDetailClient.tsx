'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, MapPin, CreditCard, StickyNote, Printer } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { OrderStatusTimeline } from '@/components/customer/OrderStatusTimeline';
import { ErrorState } from '@/components/shared/ErrorState';
import { VALID_TRANSITIONS, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatCurrency } from '@/utils';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  area: string | null;
  deliveryInstructions: string | null;
  subtotal: string;
  discountAmount: string;
  deliveryFee: string;
  taxAmount: string;
  totalAmount: string;
  couponCode: string | null;
  dealTitle: string | null;
  createdAt: string;
  timezone: string;
  items: {
    id: string;
    productName: string;
    unitPrice: string;
    quantity: number;
    subtotal: string;
    specialInstructions: string | null;
    addons: { name: string; price: string; quantity: number }[];
  }[];
  statusHistory: { status: string; note: string | null; changedBy: string | null; createdAt: string }[];
}

// Positive/neutral actions shown as filled buttons; destructive ones shown
// as outlined buttons requiring a confirmation note.
const DESTRUCTIVE = new Set(['REJECTED', 'CANCELLED']);

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setOrder(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyStatus(newStatus: string, noteText?: string) {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: noteText || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setUpdateError(json.error ?? 'Could not update status.');
        setIsUpdating(false);
        return;
      }
      setPendingStatus(null);
      setNote('');
      await load();
    } catch {
      setUpdateError('Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  if (error && !order) {
    return <ErrorState title="Order not found" message="This order could not be loaded." onRetry={load} />;
  }
  if (!order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  const nextOptions = VALID_TRANSITIONS[order.status] ?? [];

  return (
    <div className="px-4 py-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-lg font-bold text-gray-900">{order.orderNumber}</p>
          <p className="text-xs text-gray-400">
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: order.timezone,
            }).format(new Date(order.createdAt))}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <a
        href={`/admin/receipt/${order.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 active:bg-gray-50"
      >
        <Printer size={16} /> Print Receipt
      </a>

      {/* Customer info */}
      <div className="mt-4 space-y-2 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">{order.customerName}</p>
        <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 text-sm text-brand-600">
          <Phone size={14} /> {order.customerPhone}
        </a>
        {order.deliveryAddress && (
          <p className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span>
              {order.deliveryAddress}
              {order.area ? `, ${order.area}` : ''}
            </span>
          </p>
        )}
        {order.deliveryInstructions && (
          <p className="flex items-start gap-2 text-sm italic text-gray-500">
            <StickyNote size={14} className="mt-0.5 shrink-0" /> {order.deliveryInstructions}
          </p>
        )}
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <CreditCard size={14} /> {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash' : order.paymentMethod} ·{' '}
          {order.orderType === 'DELIVERY' ? 'Delivery' : order.orderType === 'PICKUP' ? 'Pickup' : 'Dine-in'}
        </p>
      </div>

      {/* Items */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-800">
                  {item.quantity}× {item.productName}
                </p>
                {item.addons.length > 0 && (
                  <p className="text-xs text-gray-400">{item.addons.map((a) => a.name).join(', ')}</p>
                )}
                {item.specialInstructions && (
                  <p className="text-xs italic text-gray-400">&ldquo;{item.specialInstructions}&rdquo;</p>
                )}
              </div>
              <span className="shrink-0 font-medium text-gray-700">
                {formatCurrency(item.subtotal, 'PKR')}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-dashed border-gray-200 pt-3 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal, 'PKR')}</span>
          </div>
          {parseFloat(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}{order.dealTitle ? ` (${order.dealTitle})` : ''}</span>
              <span>-{formatCurrency(order.discountAmount, 'PKR')}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>Delivery fee</span>
            <span>{formatCurrency(order.deliveryFee, 'PKR')}</span>
          </div>
          {parseFloat(order.taxAmount) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Tax</span>
              <span>{formatCurrency(order.taxAmount, 'PKR')}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount, 'PKR')}</span>
          </div>
        </div>
      </div>

      {/* Status timeline */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Status Timeline</h2>
        <OrderStatusTimeline
          currentStatus={order.status}
          orderType={order.orderType}
          history={order.statusHistory}
          timeZone={order.timezone}
        />
      </div>

      {/* Actions */}
      {nextOptions.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Update Status</h2>

          {pendingStatus ? (
            <div>
              <p className="mb-2 text-sm text-gray-600">
                Add a note for marking this order as{' '}
                <strong>{ORDER_STATUS_LABELS[pendingStatus]}</strong> (optional):
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="input resize-none"
                placeholder="e.g. Reason for cancellation..."
              />
              {updateError && <p className="mt-2 text-xs text-red-600">{updateError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingStatus(null);
                    setNote('');
                    setUpdateError(null);
                  }}
                  className="h-11 flex-1 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => applyStatus(pendingStatus, note)}
                  disabled={isUpdating}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nextOptions.map((next) => (
                <button
                  key={next}
                  type="button"
                  onClick={() => (DESTRUCTIVE.has(next) ? setPendingStatus(next) : applyStatus(next))}
                  disabled={isUpdating}
                  className={`flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-40 ${
                    DESTRUCTIVE.has(next)
                      ? 'border border-red-300 text-red-600'
                      : 'bg-brand-600 text-white'
                  }`}
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : `Mark as ${ORDER_STATUS_LABELS[next]}`}
                </button>
              ))}
            </div>
          )}
          {updateError && !pendingStatus && (
            <p className="mt-2 text-xs text-red-600">{updateError}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push('/admin/orders')}
        className="mt-4 text-sm font-medium text-gray-500 underline"
      >
        Back to all orders
      </button>
    </div>
  );
}
