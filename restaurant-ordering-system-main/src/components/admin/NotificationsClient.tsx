'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Bell, Check } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedOrderId: string | null;
  createdAt: string;
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=100', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setNotifications(json.data.notifications);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
  }

  async function markAllRead() {
    await fetch('/api/admin/notifications/mark-all-read', { method: 'POST' });
    setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  if (error && !notifications) return <ErrorState message="Could not load notifications." onRetry={load} />;
  if (!notifications) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="px-4 py-4">
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllRead}
          className="mb-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700"
        >
          <Check size={16} /> Mark all as read ({unreadCount})
        </button>
      )}

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} title="No notifications" message="New orders and reviews will show up here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-3.5 ${
                n.isRead ? 'border-gray-100 bg-white' : 'border-brand-200 bg-brand-50/40'
              }`}
            >
              <Link
                href={n.relatedOrderId ? `/admin/orders/${n.relatedOrderId}` : '#'}
                onClick={() => !n.isRead && markRead(n.id)}
                className="block"
              >
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <p className="mt-0.5 whitespace-pre-line text-sm text-gray-600">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </Link>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="mt-2 text-xs font-semibold text-brand-600"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
