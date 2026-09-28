'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';
import { formatCurrency } from '@/utils';

// Pages where a sticky "View Cart" bar would be redundant or get in the
// way of the page's own primary action (the cart page itself, and
// checkout, which already has its own sticky "Place Order" button).
const HIDDEN_ON_PREFIXES = ['/cart', '/checkout', '/order-confirmation', '/track'];

export function StickyCart() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, subtotal, isHydrated } = useCart();
  const { currency } = useSettings();

  const isHiddenRoute = HIDDEN_ON_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isHiddenRoute || !isHydrated || itemCount === 0) return null;

  return (
    // Sits just above the bottom nav (which is ~64px + safe-area tall)
    // so it never covers the nav or gets covered by it.
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3">
      <button
        type="button"
        onClick={() => router.push('/cart')}
        className="mx-auto flex w-full max-w-lg items-center justify-between rounded-2xl bg-brand-600 px-4 py-3 text-white shadow-lg shadow-brand-900/20 active:bg-brand-700"
        aria-label={`View cart, ${itemCount} item${itemCount === 1 ? '' : 's'}, total ${formatCurrency(subtotal, currency)}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart size={18} aria-hidden="true" />
          {itemCount} Item{itemCount === 1 ? '' : 's'} · {formatCurrency(subtotal, currency)}
        </span>
        <span className="text-sm font-bold">View Cart →</span>
      </button>
    </div>
  );
}
