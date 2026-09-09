'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, Check, Printer, X } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedOrderId: string | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 10000;

function playBeep() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio unavailable — silently skip the sound cue
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported'
  );
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  // Cached operational settings (sound + auto-print). Refetched
  // occasionally so a change made on the Settings page takes effect
  // without requiring a full page reload.
  const opSettings = useRef({ soundEnabled: true, autoPrint: false });
  const [printFallback, setPrintFallback] = useState<
    { orderId: string; orderNumber: string }[]
  >([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshSettings() {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled || !json.success) return;
        opSettings.current = {
          soundEnabled: json.data.notificationSoundEnabled,
          autoPrint: json.data.autoPrintNewOrders,
        };
      } catch {
        // Keep last-known settings if this fetch fails.
      }
    }

    refreshSettings();
    const settingsInterval = setInterval(refreshSettings, 60000);
    return () => {
      cancelled = true;
      clearInterval(settingsInterval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/admin/notifications?limit=30', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled || !json.success) return;

        const list: NotificationItem[] = json.data.notifications;
        setNotifications(list);
        setUnreadCount(json.data.unreadCount);

        const newOnes = list.filter((n) => !n.isRead && !seenIds.current.has(n.id));
        if (!isFirstLoad.current && newOnes.length > 0) {
          if (opSettings.current.soundEnabled) playBeep();
          if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            const latest = newOnes[0];
            new Notification(latest.title, { body: latest.message });
          }

          if (opSettings.current.autoPrint) {
            const newOrders = newOnes.filter((n) => n.type === 'NEW_ORDER' && n.relatedOrderId);
            for (const n of newOrders) {
              // A print dialog opened from a background timer (not a
              // direct click) can be blocked by the browser's popup
              // blocker. If so, fall back to a visible "tap to print"
              // banner instead of silently failing.
              const win = window.open(`/admin/receipt/${n.relatedOrderId}`, '_blank');
              if (!win) {
                setPrintFallback((prev) => [
                  ...prev,
                  { orderId: n.relatedOrderId as string, orderNumber: n.title },
                ]);
              }
            }
          }
        }
        list.forEach((n) => seenIds.current.add(n.id));
        isFirstLoad.current = false;
      } catch {
        // Network hiccup — next poll will retry
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function enableAlerts() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  }

  async function markAllRead() {
    await fetch('/api/admin/notifications/mark-all-read', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function dismissFallback(orderId: string) {
    setPrintFallback((prev) => prev.filter((p) => p.orderId !== orderId));
  }

  return (
    <div className="relative">
      {printFallback.length > 0 && (
        <div className="fixed left-0 right-0 top-14 z-50 mx-auto flex max-w-lg flex-col gap-2 px-3">
          {printFallback.map((p) => (
            <div
              key={p.orderId}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-sm"
            >
              <Printer size={16} className="shrink-0 text-amber-700" />
              <p className="flex-1 text-xs font-medium text-amber-800">
                {p.orderNumber} — your browser blocked auto-print. Tap to print.
              </p>
              <a
                href={`/admin/receipt/${p.orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dismissFallback(p.orderId)}
                className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white"
              >
                Print
              </a>
              <button
                type="button"
                onClick={() => dismissFallback(p.orderId)}
                aria-label="Dismiss"
                className="shrink-0 text-amber-600"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-gray-700 active:bg-gray-100"
      >
        {unreadCount > 0 ? <BellRing size={22} /> : <Bell size={22} />}
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-12 z-50 max-h-[70vh] w-80 max-w-[90vw] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
              <button
                type="button"
                onClick={enableAlerts}
                className="w-full border-b border-gray-100 px-4 py-2.5 text-left text-xs font-medium text-brand-600"
              >
                Enable desktop alerts for new orders
              </button>
            )}

            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.relatedOrderId ? `/admin/orders/${n.relatedOrderId}` : '/admin/notifications'}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 ${!n.isRead ? 'bg-brand-50/50' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
