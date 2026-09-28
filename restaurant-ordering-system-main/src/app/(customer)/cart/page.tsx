'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';
import { QuantityStepper } from '@/components/customer/QuantityStepper';
import { CouponBox } from '@/components/customer/CouponBox';
import { DealSelectBox, type AppliedDeal } from '@/components/customer/DealSelectBox';
import { PriceSummary } from '@/components/customer/PriceSummary';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/utils';

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, isHydrated } = useCart();
  const { currency, minOrderAmount } = useSettings();
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [deal, setDeal] = useState<AppliedDeal | null>(null);
  const router = useRouter();

  const minOrder = parseFloat(minOrderAmount);
  const belowMinimum = minOrder > 0 && subtotal < minOrder;

  if (!isHydrated) {
    return <div className="h-96" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={40} />}
        title="Your cart is empty"
        message="Add some delicious food to get started."
        actionHref="/menu"
        actionLabel="Browse menu"
      />
    );
  }

  return (
    <div className="px-4 py-4 pb-40">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl">🍽️</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">{item.name}</h3>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.key)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-400 active:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {item.addons.length > 0 && (
                <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                  {item.addons.map((a) => a.name).join(', ')}
                </p>
              )}
              {item.specialInstructions && (
                <p className="mt-0.5 line-clamp-1 text-xs italic text-gray-400">
                  &ldquo;{item.specialInstructions}&rdquo;
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <QuantityStepper
                  quantity={item.quantity}
                  onChange={(q) => updateQuantity(item.key, q)}
                  size="sm"
                  min={0}
                />
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(
                    (item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)) *
                      item.quantity,
                    currency
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <DealSelectBox subtotal={subtotal} currency={currency} applied={deal} onApplied={setDeal} />
      </div>

      <div className="mt-5">
        <CouponBox subtotal={subtotal} currency={currency} applied={coupon} onApplied={setCoupon} />
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
        <PriceSummary
          subtotal={subtotal}
          discountAmount={(coupon?.discountAmount ?? 0) + (deal?.discountAmount ?? 0)}
          total={subtotal - (coupon?.discountAmount ?? 0) - (deal?.discountAmount ?? 0)}
          currency={currency}
        />
        <p className="mt-2 text-xs text-gray-400">
          Delivery fee and tax are calculated at checkout.
        </p>
      </div>

      {belowMinimum && (
        <p className="mt-3 text-center text-xs font-medium text-red-600">
          Minimum order amount is {formatCurrency(minOrder, currency)}. Add{' '}
          {formatCurrency(minOrder - subtotal, currency)} more to continue.
        </p>
      )}

      <div className="fixed bottom-[64px] left-0 right-0 z-20 border-t border-gray-100 bg-white px-4 py-3">
        <button
          type="button"
          disabled={belowMinimum}
          onClick={() => {
            const params = new URLSearchParams();
            if (coupon) params.set('coupon', coupon.code);
            if (deal) params.set('deal', deal.id);
            const qs = params.toString();
            router.push(`/checkout${qs ? `?${qs}` : ''}`);
          }}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:opacity-40"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
