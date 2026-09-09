'use client';

import { useEffect } from 'react';
import { RECENT_ORDERS_KEY, type RecentOrder } from '@/utils/recent-orders';

interface RecentOrderRecorderProps {
  token: string;
  orderNumber: string;
}

/**
 * Silently remembers this order (token + number, nothing sensitive) in
 * localStorage so the customer can find it again from the "Track" tab
 * even if they close the confirmation page without saving the link.
 * No account/login is created — this is purely a convenience cache on
 * this one device/browser.
 */
export function RecentOrderRecorder({ token, orderNumber }: RecentOrderRecorderProps) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_ORDERS_KEY);
      const existing: RecentOrder[] = raw ? JSON.parse(raw) : [];
      const withoutDuplicate = existing.filter((o) => o.token !== token);
      const updated = [{ token, orderNumber, savedAt: Date.now() }, ...withoutDuplicate].slice(
        0,
        5
      );
      window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(updated));
    } catch {
      // localStorage may be unavailable (private browsing, quota) —
      // this is a convenience feature only, never a hard requirement.
    }
  }, [token, orderNumber]);

  return null;
}
