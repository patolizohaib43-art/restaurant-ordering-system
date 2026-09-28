'use client';

import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';

/**
 * Asks the customer, once, whether they'd like browser notifications for
 * order status updates. If they dismiss it or the browser doesn't
 * support the Notification API, we never show it again for this order
 * (tracked per tracking-token in localStorage) — no accounts, so this is
 * the only persistence available, and it satisfies "do not repeatedly
 * ask" without needing a server round-trip.
 */
export function NotificationPrompt({ trackingToken }: { trackingToken: string }) {
  const [visible, setVisible] = useState(false);
  const dismissedKey = `order-notif-dismissed:${trackingToken}`;

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const alreadyDismissed = window.localStorage.getItem(dismissedKey);
    if (Notification.permission === 'default' && !alreadyDismissed) {
      setVisible(true);
    }
  }, [dismissedKey]);

  function dismiss() {
    window.localStorage.setItem(dismissedKey, '1');
    setVisible(false);
  }

  async function enable() {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
    window.localStorage.setItem(dismissedKey, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-3.5">
      <BellRing size={20} className="shrink-0 text-brand-600" />
      <p className="flex-1 text-sm text-brand-900">
        Enable notifications to receive order updates.
      </p>
      <button
        type="button"
        onClick={enable}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
      >
        Enable Notifications
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-brand-400"
      >
        <X size={16} />
      </button>
    </div>
  );
}
