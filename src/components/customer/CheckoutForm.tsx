'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bike, Store, Loader2, Banknote } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';
import { PriceSummary } from '@/components/customer/PriceSummary';
import { cn, formatCurrency } from '@/utils';

type OrderType = 'DELIVERY' | 'PICKUP';

export function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromCart = searchParams.get('coupon') ?? '';
  const dealFromCart = searchParams.get('deal') ?? '';

  const { items, subtotal, clearCart, isHydrated } = useCart();
  const { currency, deliveryFee: deliveryFeeStr, taxPercentage: taxPercentageStr } = useSettings();

  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [area, setArea] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryFee = orderType === 'DELIVERY' ? parseFloat(deliveryFeeStr) : 0;
  const taxPercentage = parseFloat(taxPercentageStr);
  const discountAmount = 0; // coupon re-validated & applied server-side; shown post-order on confirmation
  const taxAmount = (subtotal - discountAmount) * (taxPercentage / 100);
  const total = subtotal - discountAmount + deliveryFee + taxAmount;

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (!customerName.trim() || !customerPhone.trim()) return false;
    if (orderType === 'DELIVERY' && !deliveryAddress.trim()) return false;
    return true;
  }, [items.length, customerName, customerPhone, orderType, deliveryAddress]);

  if (isHydrated && items.length === 0) {
    router.replace('/cart');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          orderType,
          deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
          area: area.trim() || undefined,
          deliveryInstructions: instructions.trim() || undefined,
          couponCode: couponFromCart || undefined,
          dealId: dealFromCart || undefined,
          paymentMethod: 'CASH_ON_DELIVERY',
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            specialInstructions: i.specialInstructions,
            addonIds: i.addons.map((a) => a.addonId),
          })),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Could not place your order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/order-confirmation/${json.data.trackingToken}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 pb-40">
      {/* Order type */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setOrderType('DELIVERY')}
          className={cn(
            'flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-semibold',
            orderType === 'DELIVERY'
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-gray-200 text-gray-500'
          )}
        >
          <Bike size={18} /> Delivery
        </button>
        <button
          type="button"
          onClick={() => setOrderType('PICKUP')}
          className={cn(
            'flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-semibold',
            orderType === 'PICKUP'
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-gray-200 text-gray-500'
          )}
        >
          <Store size={18} /> Pickup
        </button>
      </div>

      {/* Contact details */}
      <div className="mt-6 space-y-4">
        <Field label="Your name" required>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Ahmed Khan"
            className="input"
            required
          />
        </Field>
        <Field label="Mobile number" required>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="e.g. 03001234567"
            type="tel"
            className="input"
            required
          />
        </Field>

        {orderType === 'DELIVERY' && (
          <>
            <Field label="Delivery address" required>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House #, street, landmark..."
                rows={2}
                className="input resize-none"
                required
              />
            </Field>
            <Field label="Area">
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Gulshan-e-Iqbal"
                className="input"
              />
            </Field>
          </>
        )}

        <Field label="Special instructions">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any notes for the restaurant..."
            rows={2}
            className="input resize-none"
          />
        </Field>
      </div>

      {/* Payment method */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Payment method</h2>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-600 bg-brand-50 px-4 py-3.5">
          <Banknote size={20} className="text-brand-700" />
          <span className="text-sm font-semibold text-brand-700">
            {orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Cash on Pickup'}
          </span>
        </div>
      </div>

      {/* Order summary */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Order summary</h2>
        <PriceSummary
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          taxAmount={taxAmount}
          total={total}
          currency={currency}
        />
        {couponFromCart && (
          <p className="mt-2 text-xs text-gray-400">
            Coupon &ldquo;{couponFromCart}&rdquo; will be applied at checkout.
          </p>
        )}
        {dealFromCart && (
          <p className="mt-1 text-xs text-gray-400">Your selected deal will be applied at checkout.</p>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="fixed bottom-[64px] left-0 right-0 z-20 border-t border-gray-100 bg-white px-4 py-3">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:opacity-40"
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            `Place Order · ${formatCurrency(total, currency)}`
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
