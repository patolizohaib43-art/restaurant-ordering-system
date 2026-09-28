'use client';

import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { useAdminSession } from '@/components/admin/AdminSessionProvider';

const TITLES: { prefix: string; label: string }[] = [
  { prefix: '/admin/orders', label: 'Orders' },
  { prefix: '/admin/products', label: 'Products' },
  { prefix: '/admin/categories', label: 'Categories' },
  { prefix: '/admin/delivery-areas', label: 'Delivery Areas' },
  { prefix: '/admin/deals', label: 'Deals' },
  { prefix: '/admin/coupons', label: 'Coupons' },
  { prefix: '/admin/notifications', label: 'Notifications' },
  { prefix: '/admin/reviews', label: 'Reviews' },
  { prefix: '/admin/reports', label: 'Reports' },
  { prefix: '/admin/settings', label: 'Settings' },
  { prefix: '/admin/more', label: 'More' },
];

function titleFor(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  const match = TITLES.find((t) => pathname.startsWith(t.prefix));
  return match?.label ?? 'Admin';
}

export function AdminTopBar() {
  const pathname = usePathname();
  const { name, logout } = useAdminSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-brand-700/10 bg-white px-3 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-icon.png"
        alt="Zaiqa-e-Sindh"
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-brand-600/20"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-gray-900">{titleFor(pathname)}</p>
        <p className="truncate text-[11px] text-gray-400">{name}</p>
      </div>
      <NotificationBell />
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
      >
        <LogOut size={20} />
      </button>
    </header>
  );
}
