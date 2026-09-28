'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Tag, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils';

const TABS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList, exact: false },
  { href: '/admin/products', label: 'Products', icon: UtensilsCrossed, exact: false },
  { href: '/admin/deals', label: 'Deals', icon: Tag, exact: false },
  { href: '/admin/more', label: 'More', icon: MoreHorizontal, exact: false },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-brand-600' : 'text-gray-500'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
