'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, Tag, ShoppingCart, MapPin } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { cn } from '@/utils';

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/track', label: 'Track', icon: MapPin },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : href === '/track'
                ? pathname === '/track' || pathname.startsWith('/track/')
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-brand-600' : 'text-gray-500'
              )}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                {href === '/cart' && itemCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {itemCount}
                    <span className="sr-only"> items in cart</span>
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
