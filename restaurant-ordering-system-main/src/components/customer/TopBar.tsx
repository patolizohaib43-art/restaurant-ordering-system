'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, ChevronLeft } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';

const TITLES: Record<string, string> = {
  '/menu': 'Menu',
  '/deals': 'Deals',
  '/cart': 'Your Cart',
  '/checkout': 'Checkout',
};

function titleFor(pathname: string): string | null {
  if (pathname === '/') return null;
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/category/')) return 'Menu';
  if (pathname.startsWith('/product/')) return null;
  if (pathname === '/track' || pathname.startsWith('/track/')) return 'Track Order';
  if (pathname.startsWith('/review/')) return 'Rate Your Order';
  if (pathname.startsWith('/order-confirmation/')) return 'Order Confirmed';
  return null;
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const settings = useSettings();
  const isHome = pathname === '/';
  const title = titleFor(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white/95 px-3 backdrop-blur">
      {isHome ? (
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt={settings.restaurantName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {settings.restaurantName.charAt(0)}
            </div>
          )}
          <span className="truncate font-semibold text-gray-900">{settings.restaurantName}</span>
          <span
            className={`ml-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              settings.isOpenNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {settings.isOpenNow ? 'Open' : 'Closed'}
          </span>
        </Link>
      ) : (
        <>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 active:bg-gray-100"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
            {title ?? settings.restaurantName}
          </span>
        </>
      )}

      <Link
        href="/cart"
        aria-label="View cart"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 active:bg-gray-100"
      >
        <ShoppingCart size={22} />
        {itemCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {itemCount}
          </span>
        )}
      </Link>
    </header>
  );
}
