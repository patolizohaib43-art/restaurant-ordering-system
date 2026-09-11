'use client';

import Link from 'next/link';
import {
  Ticket,
  Star,
  Bell,
  FolderCog,
  LogOut,
  ChevronRight,
  Settings,
  BarChart3,
  MapPinned,
} from 'lucide-react';
import { useAdminSession } from '@/components/admin/AdminSessionProvider';

const LINKS = [
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { href: '/admin/categories', label: 'Categories', icon: FolderCog },
  { href: '/admin/delivery-areas', label: 'Delivery Areas', icon: MapPinned },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function MorePage() {
  const { name, email, role, logout } = useAdminSession();

  return (
    <div className="px-4 py-4">
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{email}</p>
        <span className="mt-1.5 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          {role.replace('_', ' ')}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3.5 ${i !== LINKS.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <link.icon size={18} className="text-gray-500" />
            <span className="flex-1 text-sm font-medium text-gray-800">{link.label}</span>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 text-sm font-semibold text-red-600"
      >
        <LogOut size={16} /> Log Out
      </button>
    </div>
  );
}
