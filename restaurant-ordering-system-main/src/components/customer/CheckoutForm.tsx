'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bike, Store, Loader2, Banknote, Tag, Smartphone, Copy, Check } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';
import { PriceSummary } from '@/components/customer/PriceSummary';
import { cn, formatCurrency } from '@/utils';
import { rememberPlacedOrder } from '@/utils/recent-orders';

type OrderType = 'DELIVERY' | 'PICKUP';

export function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromCart = searchParams.get('coupon') ?? '';
  const dealFromCart = searchParams.get('deal') ?? '';

  const { items, subtotal, clearCart, isHydrated } = useCart();
  const {
    currency,
    deliveryFee: deliveryFeeStr,
    freeDeliveryAboveAmount,
    taxPercentage: taxPercentageStr,
    onlinePayment,
  } = useSettings();

  // Online payment = the customer sends money to the restaurant's own
  // Easypaisa / JazzCash account (configured by the admin) and enters the
  // transaction ID. Nothing is marked paid until the admin verifies it.
  const walletProviders = onlinePayment?.providers ?? [];
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'ONLINE_WALLET'>(
    'CASH_ON_DELIVERY'
  );
  const [walletKey, setWalletKey] = useState<'EASYPAISA' | 'JAZZCASH' | ''>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSender, setPaymentSender] = useState('');
  const [copied, setCopied] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [area, setArea] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin-managed delivery zones (Phase 10). When configured, checkout
  // shows a dropdown of areas with their own delivery fee instead of a
  // free-text "Area" field, and that per-area fee is used for display —
  // always re-validated server-side against the selected deliveryAreaId,
  // never trusted from the client (see src/lib/pricing.ts).
  const [deliveryAreas, setDeliveryAreas] = useState<
    { id: string; name: string; deliveryFee: string; minOrderAmount: string | null }[] | null
  >(null);
  const [selectedAreaId, setSelectedAreaId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/delivery-areas', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setDeliveryAreas(json.data);
      } catch {
        setDeliveryAreas([]); // fall back to the global flat delivery fee
      }
    })();
  }, []);

  // The coupon/deal were already applied on the Cart page and only the
  // code is carried over via the URL — so we re-validate it here against
  // the current subtotal to get a real discount figure for the Order
  // Summary. This is DISPLAY ONLY: the actual discount that ends up on
  // the order is always recalculated server-side in POST /api/orders
  // (see src/lib/pricing.ts), which never trusts this value.
  const [previewDiscount, setPreviewDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (!couponFromCart || subtotal <= 0) {
      setPreviewDiscount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: couponFromCart, subtotal }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setCouponError(json.error ?? 'This coupon is no longer valid.');
          setPreviewDiscount(0);
          return;
        }
        setCouponError(null);
        setPreviewDiscount(parseFloat(json.data.discountAmount));
      } catch {
        if (!cancelled) setCouponError('Could not verify coupon.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponFromCart, subtotal]);

  const freeDeliveryThreshold = freeDeliveryAboveAmount ? parseFloat(freeDeliveryAboveAmount) : null;
  const discountAmount = previewDiscount;
  const subtotalAfterDiscount = Math.max(subtotal - discountAmount, 0);
  const qualifiesForFreeDelivery =
    freeDeliveryThreshold != null && subtotalAfterDiscount >= freeDeliveryThreshold;
  const selectedArea = deliveryAreas?.find((a) => a.id === selectedAreaId) ?? null;
  const baseDeliveryFee = selectedArea ? parseFloat(selectedArea.deliveryFee) : parseFloat(deliveryFeeStr);
  const deliveryFee = orderType === 'DELIVERY' && !qualifiesForFreeDelivery ? baseDeliveryFee : 0;
  const taxPercentage = parseFloat(taxPercentageStr);
  const taxAmount = subtotalAfterDiscount * (taxPercentage / 100);
  const total = subtotalAfterDiscount + deliveryFee + taxAmount;

  const selectedWallet = walletProviders.find((p) => p.key === walletKey) ?? null;

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (paymentMethod === 'ONLINE_WALLET') {
      if (!selectedWallet) return false;
      if (paymentReference.trim().length < 6 || paymentSender.trim().length < 7) return false;
    }
    if (!customerName.trim() || !customerPhone.trim()) return false;
    if (orderType === 'DELIVERY' && !deliveryAddress.trim()) return false;
    if (orderType === 'DELIVERY' && deliveryAreas && deliveryAreas.length > 0 && !selectedAreaId) {
      return false;
    }
    return true;
  }, [
    items.length,
    customerName,
    customerPhone,
    orderType,
    deliveryAddress,
    deliveryAreas,
    selectedAreaId,
    paymentMethod,
    selectedWallet,
    paymentReference,
    paymentSender,
  ]);

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
          area: selectedArea ? selectedArea.name : area.trim() || undefined,
          deliveryAreaId: orderType === 'DELIVERY' ? selectedAreaId || undefined : undefined,
          deliveryInstructions: instructions.trim() || undefined,
          couponCode: couponFromCart || undefined,
          dealId: dealFromCart || undefined,
          paymentMethod,
          ...(paymentMethod === 'ONLINE_WALLET' && {
            paymentProvider: walletKey,
            paymentReference: paymentReference.trim(),
            paymentSenderNumber: paymentSender.trim(),
          }),
          items: items
            .filter((i) => !i.dealId)
            .map((i) => ({
              productId: i.productId as string,
              quantity: i.quantity,
              specialInstructions: i.specialInstructions,
              addonIds: i.addons.map((a) => a.addonId),
            })),
          // Phase 12: bundle deals (e.g. "Deal 1") added as their own cart
          // line items, separate from the order-level discount deal
          // (`dealId` above, selected via DealSelectBox on the cart page).
          dealBundles: items
            .filter((i) => i.dealId)
            .map((i) => ({ dealId: i.dealId as string, quantity: i.quantity })),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Could not place your order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Remember the order + phone on this device, then go straight to
      // live order tracking for it.
      rememberPlacedOrder({
        token: json.data.trackingToken,
        orderNumber: json.data.orderNumber,
        phone: customerPhone.trim(),
      });
      clearCart();
      router.push(`/track/${json.data.trackingToken}?placed=1`);
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
            {deliveryAreas && deliveryAreas.length > 0 ? (
              <Field label="Delivery area" required>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="" disabled>
                    Select your area
                  </option>
                  {deliveryAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {formatCurrency(a.deliveryFee, currency)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Area">
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Gulshan-e-Iqbal"
                  className="input"
                />
              </Field>
            )}
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left',
              paymentMethod === 'CASH_ON_DELIVERY'
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200'
            )}
          >
            <Banknote
              size={20}
              className={paymentMethod === 'CASH_ON_DELIVERY' ? 'text-brand-700' : 'text-gray-400'}
            />
            <span
              className={cn(
                'text-sm font-semibold',
                paymentMethod === 'CASH_ON_DELIVERY' ? 'text-brand-700' : 'text-gray-500'
              )}
            >
              {orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Cash on Pickup'}
            </span>
          </button>

          {walletProviders.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('ONLINE_WALLET');
                if (!walletKey) setWalletKey(walletProviders[0].key);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left',
                paymentMethod === 'ONLINE_WALLET' ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
              )}
            >
              <Smartphone
                size={20}
                className={paymentMethod === 'ONLINE_WALLET' ? 'text-brand-700' : 'text-gray-400'}
              />
              <span
                className={cn(
                  'text-sm font-semibold',
                  paymentMethod === 'ONLINE_WALLET' ? 'text-brand-700' : 'text-gray-500'
                )}
              >
                Online Payment ({walletProviders.map((p) => p.label).join(' / ')})
              </span>
            </button>
          )}
        </div>

        {paymentMethod === 'ONLINE_WALLET' && (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
            {walletProviders.length > 1 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {walletProviders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setWalletKey(p.key)}
                    className={cn(
                      'h-11 rounded-xl border-2 text-sm font-semibold',
                      walletKey === p.key
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-500'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {selectedWallet && (
              <>
                <p className="text-xs text-gray-500">
                  Send <strong className="text-gray-900">{formatCurrency(total, currency)}</strong> to this{' '}
                  {selectedWallet.label} account, then enter the details below:
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-bold tracking-wide text-gray-900">
                      {selectedWallet.number}
                    </p>
                    {selectedWallet.accountName && (
                      <p className="truncate text-xs text-gray-500">{selectedWallet.accountName}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selectedWallet.number);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        /* clipboard unavailable — number is still visible */
                      }
                    }}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 active:bg-gray-50"
                  >
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {onlinePayment?.instructions && (
                  <p className="mt-2 text-xs text-gray-500">{onlinePayment.instructions}</p>
                )}

                <div className="mt-3 space-y-3">
                  <Field label="Your number (paid from)" required>
                    <input
                      value={paymentSender}
                      onChange={(e) => setPaymentSender(e.target.value)}
                      placeholder="e.g. 03001234567"
                      type="tel"
                      className="input"
                    />
                  </Field>
                  <Field label="Transaction ID (TID)" required>
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="From your payment confirmation SMS"
                      className="input"
                      autoCapitalize="characters"
                    />
                  </Field>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  Your order is confirmed after the restaurant verifies your payment.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Order summary */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Order summary</h2>
        <PriceSummary
          subtotal={subtotal}
          discountAmount={discountAmount}
          discountLabel={couponFromCart ? `Coupon (${couponFromCart})` : 'Discount'}
          deliveryFee={deliveryFee}
          taxAmount={taxAmount}
          total={total}
          currency={currency}
        />
        {couponFromCart && !couponError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700">
            <Tag size={13} /> Coupon &ldquo;{couponFromCart}&rdquo; applied
          </p>
        )}
        {couponFromCart && couponError && (
          <p className="mt-2 text-xs text-red-600">{couponError}</p>
        )}
        {dealFromCart && (
          <p className="mt-1 text-xs text-gray-400">Your selected deal will be applied at checkout.</p>
        )}
        {orderType === 'DELIVERY' && qualifiesForFreeDelivery && (
          <p className="mt-2 text-xs font-medium text-green-700">🎉 You qualify for free delivery!</p>
        )}
        {orderType === 'DELIVERY' &&
          !qualifiesForFreeDelivery &&
          freeDeliveryThreshold != null &&
          freeDeliveryThreshold > subtotalAfterDiscount && (
            <p className="mt-2 text-xs text-gray-400">
              Add {formatCurrency(freeDeliveryThreshold - subtotalAfterDiscount, currency)} more for free
              delivery.
            </p>
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
